/* =====================================================
   انار کالا
   نسخه متصل به Supabase
   خریدار + فروشنده + مالک
   + دسته‌بندی
   + جستجوی اصلی
   + جستجوی محصولات داخل فروشگاه
   + سبد خرید
   + سفارش واتساپ
   + مسدود/فعال کردن کاربر و فروشگاه
   + حذف کاربر و فروشگاه
   + فراموشی رمز عبور
   + آمار بازدید سایت و فروشگاه
===================================================== */


/* =====================================================
   SUPABASE
===================================================== */

const SUPABASE_URL =
  "https://takrpkebyubxsfdblxoc.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_yy4V71FZeOulW-SJNeMagA_Bk9jsyRf";


async function supabaseRequest(table, options = {}) {

  const {
    method = "GET",
    body = null,
    query = ""
  } = options;

  const response = await fetch(
    SUPABASE_URL + "/rest/v1/" + table + query,
    {
      method,

      headers: {
        apikey: SUPABASE_KEY,
        Authorization: "Bearer " + SUPABASE_KEY,
        "Content-Type": "application/json",
        Prefer: "return=representation"
      },

      body:
        body === null
          ? undefined
          : JSON.stringify(body)
    }
  );

  const text = await response.text();

  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {

    console.error("Supabase Error:", data);

    throw new Error(
      data?.message ||
      data?.hint ||
      data?.details ||
      data?.error_description ||
      data?.error ||
      `Supabase Error ${response.status}`
    );
  }

  return data;
}


async function supabaseRpc(
  functionName,
  body = {}
) {

  const response = await fetch(
    SUPABASE_URL +
      "/rest/v1/rpc/" +
      functionName,
    {
      method: "POST",

      headers: {
        apikey: SUPABASE_KEY,
        Authorization: "Bearer " + SUPABASE_KEY,
        "Content-Type": "application/json"
      },

      body: JSON.stringify(body)
    }
  );

  const text = await response.text();

  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {

    console.error("Supabase RPC Error:", data);

    throw new Error(
      data?.message ||
      data?.hint ||
      data?.details ||
      data?.error_description ||
      data?.error ||
      `RPC Error ${response.status}`
    );
  }

  return data;
}


/* =====================================================
   STORAGE
===================================================== */

const STORAGE = {

  currentUser:
    "anarKalaCurrentUser",

  ownerToken:
    "anarKalaOwnerToken",

  siteVisit:
    "anarKalaSiteVisitDate"

};


/* =====================================================
   مالک
===================================================== */

const OWNER = {

  id:
    "owner-admin",

  name:
    "مالک انار کالا",

  phone:
    "0799480214"

};


/* =====================================================
   دسته‌بندی‌ها
===================================================== */

const CATEGORIES = {

  food:
    ["🍎", "مواد غذایی و نوشیدنی"],

  fashion:
    ["👕", "لباس، کیف و کفش"],

  beauty:
    ["💄", "آرایشی، بهداشتی و عطر"],

  digital:
    ["📱", "موبایل و لوازم دیجیتال"],

  home:
    ["🏠", "لوازم خانه و آشپزخانه"],

  furniture:
    ["🪑", "مبلمان و دکوراسیون"],

  books:
    ["📚", "کتاب، لوازم‌التحریر و آموزشی"],

  kids:
    ["🧸", "کودک و اسباب‌بازی"],

  sports:
    ["⚽", "ورزش و سرگرمی"],

  auto:
    ["🚗", "موتر و لوازم موتر"],

  tools:
    ["🔧", "ابزار و تجهیزات"],

  jewelry:
    ["💍", "طلا، زیورات و اکسسوری"],

  fresh:
    ["🥬", "میوه و سبزیجات"],

  health:
    ["💊", "محصولات صحی"],

  general:
    ["📦", "عمومی"]

};


const LEGACY_CATEGORY_MAP = {

  clothes:
    "fashion",

  shoes:
    "fashion",

  electronics:
    "digital",

  other:
    "general"

};


function normalizeCategoryKey(category) {

  const value =
    String(category || "").trim();

  if (LEGACY_CATEGORY_MAP[value]) {
    return LEGACY_CATEGORY_MAP[value];
  }

  if (CATEGORIES[value]) {
    return value;
  }

  return "general";
}


let selectedCategories = [];

window.currentAnarKalaStoreId = "";


/* =====================================================
   ابزارهای عمومی
===================================================== */

function escapeHTML(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function toFaDigits(value) {

  return String(value)
    .replace(
      /\d/g,
      d => "۰۱۲۳۴۵۶۷۸۹"[d]
    );
}


function normalizePhone(phone) {

  return String(phone || "")
    .replace(/\s+/g, "")
    .replace(/-/g, "");
}


function normalizeSearchText(value) {

  return String(value || "")
    .toLocaleLowerCase("fa")
    .trim()
    .replace(/\s+/g, " ");
}


/* =====================================================
   ابزار وضعیت مسدودی
===================================================== */

function isBlockedValue(value) {

  return (
    value === true ||
    value === 1 ||
    value === "1" ||
    value === "true" ||
    value === "TRUE"
  );
}


function isStoreBlocked(store) {

  return !!store &&
    isBlockedValue(store.isBlocked);
}


function isUserBlocked(user) {

  return !!user &&
    isBlockedValue(user.is_blocked ?? user.isBlocked);
}


/* =====================================================
   کاربران
===================================================== */

async function getUsers() {

  const token = getOwnerToken();

  if (!token) {
    throw new Error("توکن مالک پیدا نشد.");
  }

  return await supabaseRpc(
    "admin_get_users",
    {
      p_token: token
    }
  );
}


/* =====================================================
   فروشگاه‌ها
===================================================== */

async function getStores() {

  const rows =
    await supabaseRequest(
      "stores",
      {
        query:
          "?select=*&order=id.desc"
      }
    );

  return rows.map(store => ({

    id:
      String(store.id),

    ownerId:
      store.seller_id !== null
        ? String(store.seller_id)
        : "",

    name:
      store.name,

    description:
      store.description || "",

    phone:
      store.phone || "",

    whatsapp:
      store.whatsapp || "",

    category:
      normalizeCategoryKey(
        store.category || "general"
      ),

    logo:
      store.logo_url || "",

    isBlocked:
      isBlockedValue(
        store.is_blocked
      )

  }));
}


/* =====================================================
   محصولات
===================================================== */

async function getProducts() {

  const rows =
    await supabaseRequest(
      "products",
      {
        query:
          "?select=*&order=id.desc"
      }
    );

  return rows.map(product => ({

    id:
      String(product.id),

    storeId:
      product.store_id !== null
        ? String(product.store_id)
        : "",

    ownerId:
      product.owner_id !== null
        ? String(product.owner_id)
        : "",

    name:
      product.name,

    price:
      product.price,

    description:
      product.description || "",

    whatsapp:
      product.whatsapp || "",

    image:
      product.image_url || ""

  }));
}


/* =====================================================
   فروشگاه بر اساس ID
===================================================== */

async function getStoreById(storeId) {

  const rows =
    await supabaseRequest(
      "stores",
      {
        query:
          "?select=*&id=eq." +
          encodeURIComponent(storeId) +
          "&limit=1"
      }
    );

  if (!rows.length) {
    return null;
  }

  const store = rows[0];

  return {

    id:
      String(store.id),

    ownerId:
      store.seller_id !== null
        ? String(store.seller_id)
        : "",

    name:
      store.name,

    description:
      store.description || "",

    phone:
      store.phone || "",

    whatsapp:
      store.whatsapp || "",

    category:
      normalizeCategoryKey(
        store.category || "general"
      ),

    logo:
      store.logo_url || "",

    isBlocked:
      isBlockedValue(
        store.is_blocked
      )

  };
}


/* =====================================================
   محصولات یک فروشگاه
===================================================== */

async function getProductsByStore(storeId) {

  const rows =
    await supabaseRequest(
      "products",
      {
        query:
          "?select=*&store_id=eq." +
          encodeURIComponent(storeId) +
          "&order=id.desc"
      }
    );

  return rows.map(product => ({

    id:
      String(product.id),

    storeId:
      String(product.store_id),

    ownerId:
      product.owner_id !== null
        ? String(product.owner_id)
        : "",

    name:
      product.name,

    price:
      product.price,

    description:
      product.description || "",

    whatsapp:
      product.whatsapp || "",

    image:
      product.image_url || ""

  }));
}


/* =====================================================
   کاربر فعلی
===================================================== */

function getCurrentUser() {

  try {

    const user =
      JSON.parse(
        localStorage.getItem(
          STORAGE.currentUser
        ) || "null"
      );

    if (
      user &&
      user.type === "admin"
    ) {

      const token =
        localStorage.getItem(
          STORAGE.ownerToken
        );

      if (token) {
        user.token = token;
      }
    }

    return user;

  } catch {

    return null;

  }
}


function setCurrentUser(user) {

  if (!user) {

    localStorage.removeItem(
      STORAGE.currentUser
    );

    return;
  }

  if (
    user.type === "admin" &&
    !user.token
  ) {

    const oldToken =
      localStorage.getItem(
        STORAGE.ownerToken
      );

    if (oldToken) {
      user.token = oldToken;
    }
  }

  localStorage.setItem(
    STORAGE.currentUser,
    JSON.stringify(user)
  );

  if (
    user.type === "admin" &&
    user.token
  ) {

    localStorage.setItem(
      STORAGE.ownerToken,
      user.token
    );
  }
}


function getOwnerToken() {

  return localStorage.getItem(
    STORAGE.ownerToken
  );
}


/* =====================================================
   مالک
===================================================== */

function isOwner(user) {

  return !!user &&
    user.type === "admin" &&
    user.id === OWNER.id &&
    normalizePhone(user.phone) ===
      normalizePhone(OWNER.phone);
}


async function requireOwnerAccess() {

  const user = getCurrentUser();

  if (!isOwner(user)) {

    alert(
      "فقط مالک اصلی سایت اجازه این عملیات را دارد."
    );

    return false;
  }

  const token = getOwnerToken();

  if (!token) {

    alert(
      "جلسه مالک پیدا نشد. دوباره وارد شوید."
    );

    return false;
  }

  try {

    const result =
      await supabaseRpc(
        "verify_owner_token",
        {
          p_token: token
        }
      );

    if (result !== true) {

      localStorage.removeItem(
        STORAGE.ownerToken
      );

      localStorage.removeItem(
        STORAGE.currentUser
      );

      alert(
        "جلسه مالک منقضی یا نامعتبر است."
      );

      openAuth();

      return false;
    }

    return true;

  } catch (error) {

    console.error(
      "OWNER VERIFY ERROR:",
      error
    );

    alert(
      "خطا در بررسی دسترسی مالک:\n\n" +
      error.message
    );

    return false;
  }
}


/* =====================================================
   آمار بازدید سایت
===================================================== */

function getLocalDateKey() {

  const now = new Date();

  return (
    now.getFullYear() +
    "-" +
    String(
      now.getMonth() + 1
    ).padStart(2, "0") +
    "-" +
    String(
      now.getDate()
    ).padStart(2, "0")
  );
}


async function registerSiteVisitOncePerDay() {

  try {

    const today =
      getLocalDateKey();

    const lastVisit =
      localStorage.getItem(
        STORAGE.siteVisit
      );

    if (lastVisit === today) {
      return;
    }

    await supabaseRpc(
      "register_site_visit",
      {}
    );

    localStorage.setItem(
      STORAGE.siteVisit,
      today
    );

  } catch (error) {

    console.error(
      "SITE VISIT ERROR:",
      error
    );

  }
}


async function registerStoreVisitOncePerDay(
  storeId
) {

  if (!storeId) {
    return;
  }

  try {

    const key =
      "anarKalaStoreVisit_" +
      String(storeId);

    const today =
      getLocalDateKey();

    const lastVisit =
      localStorage.getItem(key);

    if (lastVisit === today) {
      return;
    }

    await supabaseRpc(
      "register_store_visit",
      {
        p_store_id:
          Number(storeId)
      }
    );

    localStorage.setItem(
      key,
      today
    );

  } catch (error) {

    console.error(
      "STORE VISIT ERROR:",
      error
    );

  }
}


async function getVisitorStats() {

  const access =
    await requireOwnerAccess();

  if (!access) {
    return null;
  }

  const token =
    getOwnerToken();

  return await supabaseRpc(
    "admin_get_visitor_stats",
    {
      p_token: token
    }
  );
}


async function getAllStoreVisitorStats() {

  const access =
    await requireOwnerAccess();

  if (!access) {
    return [];
  }

  const token =
    getOwnerToken();

  const result =
    await supabaseRpc(
      "admin_get_all_store_stats",
      {
        p_token: token
      }
    );

  return Array.isArray(result)
    ? result
    : [];
}


async function getStoreVisitorStats(
  storeId
) {

  const access =
    await requireOwnerAccess();

  if (!access) {
    return null;
  }

  const token =
    getOwnerToken();

  return await supabaseRpc(
    "admin_get_store_visitor_stats",
    {
      p_store_id:
        Number(storeId),

      p_token:
        token
    }
  );
}


/* =====================================================
   واتساپ
===================================================== */

function normalizeWhatsapp(number) {

  let value =
    String(number || "")
      .replace(/\s+/g, "")
      .replace(/-/g, "");

  if (!value) {
    return "";
  }

  if (value.startsWith("07")) {
    value =
      "93" +
      value.substring(1);
  }

  if (value.startsWith("+93")) {
    value =
      value.substring(1);
  }

  if (value.startsWith("0093")) {
    value =
      value.substring(2);
  }

  return value;
}


function getWhatsappNumber(
  productWhatsapp,
  storeWhatsapp
) {

  const productNumber =
    normalizeWhatsapp(
      productWhatsapp
    );

  if (productNumber) {
    return productNumber;
  }

  return normalizeWhatsapp(
    storeWhatsapp
  );
}


function openWhatsapp(
  number,
  message
) {

  const whatsappNumber =
    normalizeWhatsapp(number);

  if (!whatsappNumber) {

    alert(
      "شماره واتساپ فروشنده ثبت نشده است."
    );

    return false;
  }

  const url =
    "https://wa.me/" +
    whatsappNumber +
    "?text=" +
    encodeURIComponent(message);

  window.open(
    url,
    "_blank"
  );

  return true;
}


/* =====================================================
   سفارش مستقیم واتساپ
===================================================== */

async function orderProductOnWhatsapp(
  storeId,
  productId
) {

  try {

    const store =
      await getStoreById(storeId);

    if (!store) {

      alert("فروشگاه پیدا نشد.");

      return;
    }

    if (store.isBlocked) {

      alert(
        "این فروشگاه در حال حاضر مسدود است."
      );

      return;
    }

    const products =
      await getProductsByStore(storeId);

    const product =
      products.find(
        item =>
          String(item.id) ===
          String(productId)
      );

    if (!product) {

      alert("محصول پیدا نشد.");

      return;
    }

    const whatsapp =
      getWhatsappNumber(
        product.whatsapp,
        store.whatsapp
      );

    if (!whatsapp) {

      alert(
        "شماره واتساپ این فروشگاه ثبت نشده است."
      );

      return;
    }

    const price =
      Number(product.price) || 0;

    const message =
      "سلام، می‌خواهم این محصول را سفارش بدهم:\n\n" +
      "🏪 فروشگاه: " +
      store.name +
      "\n" +
      "📦 محصول: " +
      product.name +
      "\n" +
      "🔢 تعداد: ۱\n" +
      "💰 قیمت واحد: " +
      price.toLocaleString("fa-AF") +
      " افغانی\n" +
      "💵 مجموع: " +
      price.toLocaleString("fa-AF") +
      " افغانی\n\n" +
      "لطفاً سفارش من را تأیید کنید.";

    openWhatsapp(
      whatsapp,
      message
    );

  } catch (error) {

    console.error(
      "DIRECT WHATSAPP ERROR:",
      error
    );

    alert(
      "ارسال سفارش انجام نشد:\n\n" +
      error.message
    );
  }
}


/* =====================================================
   آپلود تصویر
===================================================== */

async function uploadFileToStorage(
  input,
  folder = "images"
) {

  const file =
    input &&
    input.files &&
    input.files[0];

  if (!file) {
    return "";
  }

  if (!file.type.startsWith("image/")) {

    alert(
      "لطفاً فقط فایل تصویری انتخاب کنید."
    );

    input.value = "";

    throw new Error("Invalid image");
  }

  if (file.size > 5 * 1024 * 1024) {

    alert(
      "حجم عکس حداکثر 5MB باشد."
    );

    input.value = "";

    throw new Error("Image too large");
  }

  const extension =
    file.name.includes(".")
      ? file.name.split(".").pop().toLowerCase()
      : "jpg";

  const fileName =
    Date.now() +
    "-" +
    Math.random()
      .toString(36)
      .substring(2, 10) +
    "." +
    extension;

  const objectPath =
    folder + "/" + fileName;

  const encodedPath =
    objectPath
      .split("/")
      .map(encodeURIComponent)
      .join("/");

  const uploadResponse =
    await fetch(
      SUPABASE_URL +
        "/storage/v1/object/anar-kala-files/" +
        encodedPath,
      {
        method: "POST",

        headers: {
          apikey: SUPABASE_KEY,
          Authorization:
            "Bearer " + SUPABASE_KEY,
          "Content-Type": file.type,
          "x-upsert": "true"
        },

        body: file
      }
    );

  const text =
    await uploadResponse.text();

  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!uploadResponse.ok) {

    console.error(
      "STORAGE UPLOAD ERROR:",
      data
    );

    throw new Error(
      data?.message ||
      data?.error ||
      data?.error_description ||
      `خطای آپلود فایل ${uploadResponse.status}`
    );
  }

  return (
    SUPABASE_URL +
    "/storage/v1/object/public/anar-kala-files/" +
    encodedPath
  );
}


/* =====================================================
   ایجاد بخش جستجوی صفحه اصلی
===================================================== */

function ensureHomeSearchBox() {

  const home =
    document.getElementById("homePage");

  if (!home) {
    return;
  }

  if (
    document.getElementById(
      "anarKalaHomeSearch"
    )
  ) {
    return;
  }

  const categories =
    document.getElementById(
      "categoriesList"
    );

  if (!categories) {
    return;
  }

  const wrapper =
    document.createElement("div");

  wrapper.id =
    "anarKalaHomeSearch";

  wrapper.style.cssText = `
    width:100%;
    margin:15px 0 20px;
    padding:15px;
    background:#fff;
    border-radius:16px;
    box-shadow:0 2px 10px rgba(0,0,0,.06);
  `;

  wrapper.innerHTML = `

    <div style="
      display:flex;
      gap:8px;
      flex-wrap:wrap;
      margin-bottom:10px;
    ">

      <button
        type="button"
        class="searchTypeBtn active"
        data-search-type="all"
        onclick="setHomeSearchType('all')">

        همه

      </button>

      <button
        type="button"
        class="searchTypeBtn"
        data-search-type="store"
        onclick="setHomeSearchType('store')">

        🏪 فروشگاه

      </button>

      <button
        type="button"
        class="searchTypeBtn"
        data-search-type="category"
        onclick="setHomeSearchType('category')">

        📂 دسته‌بندی

      </button>

    </div>

    <div style="
      display:flex;
      gap:8px;
    ">

      <input
        id="homeSearchInput"
        type="search"
        placeholder="جستجوی فروشگاه، دسته‌بندی یا محصول..."
        autocomplete="off"
        style="
          flex:1;
          min-width:0;
        ">

      <button
        type="button"
        class="mainBtn"
        onclick="performHomeSearch()">

        🔍 جستجو

      </button>

    </div>

    <div
      id="homeSearchResults"
      style="margin-top:15px;">
    </div>

  `;

  categories.parentNode.insertBefore(
    wrapper,
    categories
  );

  const input =
    document.getElementById(
      "homeSearchInput"
    );

  if (input) {

    input.addEventListener(
      "keydown",
      function(event) {

        if (event.key === "Enter") {
          performHomeSearch();
        }

      }
    );

    input.addEventListener(
      "input",
      function() {

        if (!input.value.trim()) {
          clearHomeSearch();
        }

      }
    );
  }
}


let homeSearchType = "all";


function setHomeSearchType(type) {

  homeSearchType = type;

  document
    .querySelectorAll(
      ".searchTypeBtn"
    )
    .forEach(button => {

      button.classList.toggle(
        "active",
        button.dataset.searchType === type
      );

    });

  const input =
    document.getElementById(
      "homeSearchInput"
    );

  if (input) {

    const placeholders = {

      all:
        "جستجوی فروشگاه، دسته‌بندی یا محصول...",

      store:
        "نام فروشگاه را جستجو کنید...",

      category:
        "نام دسته‌بندی را جستجو کنید..."

    };

    input.placeholder =
      placeholders[type] ||
      placeholders.all;
  }
}


function clearHomeSearch() {

  const result =
    document.getElementById(
      "homeSearchResults"
    );

  if (result) {
    result.innerHTML = "";
  }
}


async function performHomeSearch() {

  const input =
    document.getElementById(
      "homeSearchInput"
    );

  const result =
    document.getElementById(
      "homeSearchResults"
    );

  if (!input || !result) {
    return;
  }

  const query =
    normalizeSearchText(
      input.value
    );

  if (!query) {

    clearHomeSearch();

    return;
  }

  result.innerHTML = `
    <div class="empty">
      در حال جستجو...
    </div>
  `;

  try {

    const stores =
      await getStores();

    const products =
      await getProducts();

    let html = "";


    /* ===============================================
       جستجوی دسته‌بندی
    =============================================== */

    if (
      homeSearchType === "all" ||
      homeSearchType === "category"
    ) {

      const categoryResults =
        Object.keys(CATEGORIES)
          .filter(key => {

            const name =
              normalizeSearchText(
                CATEGORIES[key][1]
              );

            const icon =
              normalizeSearchText(
                CATEGORIES[key][0]
              );

            return (
              name.includes(query) ||
              icon.includes(query)
            );
          });

      if (
        categoryResults.length
      ) {

        html += `
          <div style="
            margin-bottom:18px;
          ">

            <h3>
              📂 دسته‌بندی‌ها
            </h3>

            <div style="
              display:grid;
              grid-template-columns:
                repeat(auto-fit,minmax(150px,1fr));
              gap:10px;
            ">

              ${
                categoryResults
                  .map(key => `

                    <button
                      type="button"
                      class="categoryItem"
                      onclick="
                        selectSearchCategory(
                          '${key}'
                        )
                      "
                      style="
                        cursor:pointer;
                      ">

                      <span class="categoryIcon">
                        ${CATEGORIES[key][0]}
                      </span>

                      <span class="categoryName">
                        ${escapeHTML(
                          CATEGORIES[key][1]
                        )}
                      </span>

                    </button>

                  `)
                  .join("")
              }

            </div>

          </div>
        `;
      }
    }


    /* ===============================================
       جستجوی فروشگاه
    =============================================== */

    if (
      homeSearchType === "all" ||
      homeSearchType === "store"
    ) {

      const storeResults =
        stores.filter(store => {

          if (store.isBlocked) {
            return false;
          }

          const name =
            normalizeSearchText(
              store.name
            );

          const description =
            normalizeSearchText(
              store.description
            );

          const category =
            normalizeSearchText(
              getCategoryName(
                store.category
              )
            );

          return (
            name.includes(query) ||
            description.includes(query) ||
            category.includes(query)
          );
        });

      if (storeResults.length) {

        html += `
          <div style="
            margin-bottom:18px;
          ">

            <h3>
              🏪 فروشگاه‌ها
            </h3>

            <div class="stores">
        `;

        storeResults.forEach(store => {

          html += createStoreCardHTML(
            store
          );

        });

        html += `
            </div>
          </div>
        `;
      }
    }


    /* ===============================================
       جستجوی محصولات
       فقط در حالت «همه»
    =============================================== */

    if (
      homeSearchType === "all"
    ) {

      const productResults =
        products.filter(product => {

          const name =
            normalizeSearchText(
              product.name
            );

          const description =
            normalizeSearchText(
              product.description
            );

          const store =
            stores.find(
              item =>
                String(item.id) ===
                String(product.storeId)
            );

          if (store && store.isBlocked) {
            return false;
          }

          return (
            name.includes(query) ||
            description.includes(query)
          );
        });

      if (productResults.length) {

        html += `
          <div style="
            margin-bottom:18px;
          ">

            <h3>
              📦 محصولات
            </h3>

            <div class="products">
        `;

        for (
          const product of productResults
        ) {

          const store =
            stores.find(
              item =>
                String(item.id) ===
                String(product.storeId)
            );

          html +=
            createSearchProductHTML(
              product,
              store
            );
        }

        html += `
            </div>
          </div>
        `;
      }
    }


    if (!html) {

      html = `
        <div class="empty">
          نتیجه‌ای برای «${escapeHTML(query)}» پیدا نشد.
        </div>
      `;
    }

    result.innerHTML = html;

  } catch (error) {

    console.error(
      "HOME SEARCH ERROR:",
      error
    );

    result.innerHTML = `
      <div class="empty">
        جستجو انجام نشد.
        <br>
        ${escapeHTML(error.message)}
      </div>
    `;
  }
}


function selectSearchCategory(category) {

  selectedCategories = [
    normalizeCategoryKey(category)
  ];

  clearHomeSearch();

  showSelectedStores();
}


function createStoreCardHTML(store) {

  if (!store || store.isBlocked) {
    return "";
  }

  const logo =
    store.logo || "";

  const logoHTML =
    logo
      ? `
        <img
          src="${escapeHTML(logo)}"
          class="storeLogo"
          alt="لوگوی فروشگاه">
      `
      : `
        <div class="storePlaceholder">
          🏪
        </div>
      `;

  return `

    <div class="storeCard">

      ${logoHTML}

      <h3>
        ${escapeHTML(store.name)}
      </h3>

      <p>
        ${escapeHTML(
          store.description ||
          "بدون توضیحات"
        )}
      </p>

      <span class="storeCategory">
        ${escapeHTML(
          getCategoryName(
            store.category
          )
        )}
      </span>

      <button
        type="button"
        onclick="
          openStore('${escapeHTML(store.id)}')
        ">

        ورود به فروشگاه

      </button>

    </div>

  `;
}


function createSearchProductHTML(
  product,
  store
) {

  if (store && store.isBlocked) {
    return "";
  }

  return `

    <div class="productCard">

      ${
        product.image
          ? `
            <img
              src="${escapeHTML(product.image)}"
              class="productImage"
              alt="عکس محصول">
          `
          : `
            <div class="productPlaceholder">
              📦
            </div>
          `
      }

      <div class="productInfo">

        <h3>
          ${escapeHTML(product.name)}
        </h3>

        <p>
          ${escapeHTML(
            product.description || ""
          )}
        </p>

        <div class="price">
          ${toFaDigits(
            Number(product.price || 0)
          )}
          افغانی
        </div>

        ${
          store
            ? `
              <p style="
                font-size:13px;
                color:#666;
              ">
                🏪
                ${escapeHTML(store.name)}
              </p>

              <button
                type="button"
                class="mainBtn"
                onclick="
                  openStore('${escapeHTML(store.id)}')
                ">

                ورود به فروشگاه

              </button>
            `
            : ""
        }

      </div>

    </div>

  `;
}


/* =====================================================
   شروع برنامه
===================================================== */

async function initialize() {

  ensureHomeSearchBox();

  renderCategories();

  renderStores([]);

  try {

    const title =
      document.getElementById(
        "storesTitle"
      );

    if (title) {

      title.textContent =
        "برای دیدن فروشگاه‌ها یک دسته را انتخاب کنید";

    }

  } catch (error) {

    console.error(
      "INITIALIZE ERROR:",
      error
    );
  }

  updateGlobalCartButton();

  /*
     ثبت بازدید سایت.
     در هر مرورگر فقط یک بار در روز ثبت می‌شود.
  */

  registerSiteVisitOncePerDay();
}


document.addEventListener(
  "DOMContentLoaded",
  initialize
);


/* =====================================================
   صفحات
===================================================== */

function hideAllPages() {

  document
    .querySelectorAll(".page")
    .forEach(page => {

      page.classList.add("hidden");

    });
}


async function showHome() {

  hideAllPages();

  const homePage =
    document.getElementById(
      "homePage"
    );

  if (homePage) {

    homePage.classList.remove(
      "hidden"
    );
  }

  window.currentAnarKalaStoreId = "";

  renderCategories();

  ensureHomeSearchBox();

  if (selectedCategories.length) {

    await showSelectedStores(
      false
    );

  } else {

    renderStores([]);

    const title =
      document.getElementById(
        "storesTitle"
      );

    if (title) {

      title.textContent =
        "برای دیدن فروشگاه‌ها یک دسته را انتخاب کنید";

    }
  }

  updateGlobalCartButton();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


/* =====================================================
   دسته‌بندی
===================================================== */

function renderCategories() {

  const container =
    document.getElementById(
      "categoriesList"
    ) ||
    document.getElementById(
      "categories"
    );

  if (!container) {
    return;
  }

  container.innerHTML = "";

  Object.keys(CATEGORIES)
    .forEach(key => {

      const icon =
        CATEGORIES[key][0];

      const name =
        CATEGORIES[key][1];

      const selected =
        selectedCategories.includes(key);

      const div =
        document.createElement("div");

      div.className =
        "categoryItem" +
        (
          selected
            ? " active"
            : ""
        );

      div.innerHTML = `

        <div class="categoryCheck">
          ${
            selected
              ? "✓"
              : ""
          }
        </div>

        <span class="categoryIcon">
          ${icon}
        </span>

        <span class="categoryName">
          ${escapeHTML(name)}
        </span>

        <button
          type="button"
          onclick="
            event.stopPropagation();
            toggleCategory('${key}')
          ">

          ${
            selected
              ? "انتخاب شد"
              : "انتخاب"
          }

        </button>

      `;

      div.addEventListener(
        "click",
        function() {

          toggleCategory(key);

        }
      );

      container.appendChild(
        div
      );

    });

  updateSelectedCount();
}


function toggleCategory(category) {

  const normalized =
    normalizeCategoryKey(category);

  const index =
    selectedCategories.indexOf(
      normalized
    );

  if (index === -1) {

    selectedCategories.push(
      normalized
    );

  } else {

    selectedCategories.splice(
      index,
      1
    );
  }

  renderCategories();

  if (selectedCategories.length) {

    showSelectedStores(false);

  } else {

    renderStores([]);

    const title =
      document.getElementById(
        "storesTitle"
      );

    if (title) {

      title.textContent =
        "برای دیدن فروشگاه‌ها یک دسته را انتخاب کنید";

    }
  }
}


function updateSelectedCount() {

  const element =
    document.getElementById(
      "selectedCount"
    );

  if (!element) {
    return;
  }

  element.textContent =
    toFaDigits(
      selectedCategories.length
    ) +
    " دسته انتخاب شده";
}


async function clearSelectedCategories() {

  selectedCategories = [];

  renderCategories();

  renderStores([]);

  const title =
    document.getElementById(
      "storesTitle"
    );

  if (title) {

    title.textContent =
      "برای دیدن فروشگاه‌ها یک دسته را انتخاب کنید";

  }

  clearHomeSearch();
}


/* =====================================================
   فروشگاه‌های دسته‌های انتخاب‌شده
===================================================== */

async function showSelectedStores(
  showAlert = true
) {

  if (
    selectedCategories.length === 0
  ) {

    if (showAlert) {

      alert(
        "حداقل یک دسته را انتخاب کنید."
      );
    }

    renderStores([]);

    return;
  }

  try {

    const stores =
      await getStores();

    const filtered =
      stores.filter(store => {

        if (store.isBlocked) {
          return false;
        }

        const category =
          normalizeCategoryKey(
            store.category
          );

        return selectedCategories.includes(
          category
        );
      });

    renderStores(filtered);

    const title =
      document.getElementById(
        "storesTitle"
      );

    if (title) {

      title.textContent =
        "فروشگاه‌های دسته‌های انتخاب‌شده";

    }

    const list =
      document.getElementById(
        "storesList"
      );

    if (
      list &&
      !filtered.length
    ) {

      list.innerHTML = `
        <div class="empty">
          در دسته‌های انتخاب‌شده هنوز فروشگاهی وجود ندارد.
        </div>
      `;
    }

  } catch (error) {

    console.error(
      "FILTER STORES ERROR:",
      error
    );

    if (showAlert) {

      alert(
        "دریافت فروشگاه‌ها انجام نشد:\n" +
        error.message
      );
    }
  }
}


/* =====================================================
   نمایش فروشگاه‌ها
===================================================== */

function renderStores(stores) {

  const container =
    document.getElementById(
      "storesList"
    );

  if (!container) {
    return;
  }

  container.innerHTML = "";

  if (!stores.length) {
    return;
  }

  stores.forEach(store => {

    if (store.isBlocked) {
      return;
    }

    const card =
      document.createElement("div");

    card.innerHTML =
      createStoreCardHTML(store);

    if (card.firstElementChild) {

      container.appendChild(
        card.firstElementChild
      );
    }

  });
}


/* =====================================================
   صفحه فروشگاه
===================================================== */

async function openStore(storeId) {

  try {

    const store =
      await getStoreById(storeId);

    if (!store) {

      alert(
        "فروشگاه پیدا نشد."
      );

      return;
    }

    /*
       فروشگاه مسدود فقط برای مالک خودش
       یا مالک اصلی سایت قابل مشاهده است.
    */

    const currentUser =
      getCurrentUser();

    const canViewBlocked =
      (
        isOwner(currentUser)
      ) ||
      (
        currentUser &&
        currentUser.type === "seller" &&
        String(currentUser.id) ===
          String(store.ownerId)
      );

    if (
      store.isBlocked &&
      !canViewBlocked
    ) {

      alert(
        "این فروشگاه توسط مالک سایت مسدود شده است."
      );

      return;
    }

    hideAllPages();

    const storePage =
      document.getElementById(
        "storePage"
      );

    if (storePage) {

      storePage.classList.remove(
        "hidden"
      );
    }

    window.currentAnarKalaStoreId =
      String(store.id);

    /*
       بازدید فروشگاه
       فقط برای بازدید عمومی ثبت می‌شود.
    */

    if (!store.isBlocked) {

      registerStoreVisitOncePerDay(
        store.id
      );
    }

    const logo =
      store.logo || "";

    const logoHTML =
      logo
        ? `
          <img
            src="${escapeHTML(logo)}"
            class="storeHeaderLogo"
            alt="لوگوی فروشگاه">
        `
        : `
          <div class="storeHeaderPlaceholder">
            🏪
          </div>
        `;

    const storeHeader =
      document.getElementById(
        "storeHeader"
      );

    if (storeHeader) {

      storeHeader.innerHTML = `

        <div class="storeHeaderTop">

          ${logoHTML}

          <div>

            <h1>
              ${escapeHTML(store.name)}
            </h1>

            <p>
              ${escapeHTML(
                store.description || ""
              )}
            </p>

            <p>
              دسته:
              ${escapeHTML(
                getCategoryName(
                  store.category
                )
              )}
            </p>

            ${
              store.phone
                ? `
                  <p>
                    📞
                    ${escapeHTML(
                      store.phone
                    )}
                  </p>
                `
                : ""
            }

            ${
              store.isBlocked
                ? `
                  <p style="
                    color:#b00020;
                    font-weight:bold;
                  ">
                    ⚠️ این فروشگاه مسدود است.
                  </p>
                `
                : ""
            }

          </div>

        </div>

        <div
          id="storeSearchBox"
          style="
            margin-top:15px;
          ">

          <div style="
            display:flex;
            gap:8px;
          ">

            <input
              id="storeProductSearch"
              type="search"
              placeholder="جستجوی محصول در این فروشگاه..."
              autocomplete="off"
              style="
                flex:1;
                min-width:0;
              ">

            <button
              type="button"
              class="mainBtn"
              onclick="
                searchProductsInCurrentStore()
              ">

              🔍 جستجو

            </button>

          </div>

        </div>

      `;
    }

    const products =
      await getProductsByStore(
        store.id
      );

    renderStoreProducts(products);

    updateCartButton();
    updateGlobalCartButton();

    const searchInput =
      document.getElementById(
        "storeProductSearch"
      );

    if (searchInput) {

      searchInput.addEventListener(
        "input",
        function() {

          const value =
            searchInput.value.trim();

          if (!value) {

            renderStoreProducts(
              products
            );

            return;
          }

          filterStoreProducts(
            products,
            value
          );

        }
      );

      searchInput.addEventListener(
        "keydown",
        function(event) {

          if (event.key === "Enter") {
            searchProductsInCurrentStore();
          }

        }
      );
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

  } catch (error) {

    console.error(
      "OPEN STORE ERROR:",
      error
    );

    alert(
      "باز کردن فروشگاه انجام نشد:\n" +
      error.message
    );
  }
}


/* =====================================================
   جستجوی محصول داخل فروشگاه
===================================================== */

async function searchProductsInCurrentStore() {

  const storeId =
    window.currentAnarKalaStoreId;

  if (!storeId) {
    return;
  }

  const input =
    document.getElementById(
      "storeProductSearch"
    );

  if (!input) {
    return;
  }

  const query =
    input.value.trim();

  try {

    const store =
      await getStoreById(storeId);

    if (
      store &&
      store.isBlocked
    ) {

      const user =
        getCurrentUser();

      const allowed =
        isOwner(user) ||
        (
          user &&
          user.type === "seller" &&
          String(user.id) ===
            String(store.ownerId)
        );

      if (!allowed) {

        alert(
          "این فروشگاه مسدود است."
        );

        return;
      }
    }

    const products =
      await getProductsByStore(
        storeId
      );

    filterStoreProducts(
      products,
      query
    );

  } catch (error) {

    console.error(
      "STORE SEARCH ERROR:",
      error
    );

    alert(
      "جستجوی محصول انجام نشد:\n" +
      error.message
    );
  }
}


function filterStoreProducts(
  products,
  query
) {

  const normalized =
    normalizeSearchText(query);

  if (!normalized) {

    renderStoreProducts(products);

    return;
  }

  const filtered =
    products.filter(product => {

      const name =
        normalizeSearchText(
          product.name
        );

      const description =
        normalizeSearchText(
          product.description
        );

      return (
        name.includes(normalized) ||
        description.includes(normalized)
      );
    });

  renderStoreProducts(filtered);

  if (!filtered.length) {

    const container =
      document.getElementById(
        "productsList"
      );

    if (container) {

      container.innerHTML = `
        <div class="empty">
          محصولی با عبارت
          «${escapeHTML(query)}»
          در این فروشگاه پیدا نشد.
        </div>
      `;
    }
  }
}


/* =====================================================
   محصولات فروشگاه
===================================================== */

async function renderStoreProducts(
  products
) {

  const container =
    document.getElementById(
      "productsList"
    );

  if (!container) {
    return;
  }

  container.innerHTML = "";

  if (!products.length) {

    container.innerHTML = `
      <div class="empty">
        این فروشگاه هنوز محصولی ثبت نکرده است.
      </div>
    `;

    updateCartButton();

    return;
  }

  products.forEach(product => {

    const image =
      product.image || "";

    const imageHTML =
      image
        ? `
          <img
            src="${escapeHTML(image)}"
            class="productImage"
            alt="عکس محصول">
        `
        : `
          <div class="productPlaceholder">
            📦
          </div>
        `;

    const card =
      document.createElement("div");

    card.className =
      "productCard";

    card.innerHTML = `

      ${imageHTML}

      <div class="productInfo">

        <h3>
          ${escapeHTML(product.name)}
        </h3>

        <p>
          ${escapeHTML(
            product.description || ""
          )}
        </p>

        <div class="price">
          ${toFaDigits(
            Number(product.price || 0)
          )}
          افغانی
        </div>

        <button
          class="mainBtn"
          type="button"
          onclick="
            addToCart(
              '${escapeHTML(product.storeId)}',
              '${escapeHTML(product.id)}'
            )
          ">

          🛒 افزودن به سبد خرید

        </button>

        <button
          class="mainBtn"
          type="button"
          style="
            margin-top:8px;
            background:#25D366;
            color:white;
          "
          onclick="
            orderProductOnWhatsapp(
              '${escapeHTML(product.storeId)}',
              '${escapeHTML(product.id)}'
            )
          ">

          🟢 سفارش مستقیم واتساپ

        </button>

      </div>
    `;

    container.appendChild(card);

  });

  updateCartButton();
}


/* =====================================================
   سبد خرید
===================================================== */

function getCartStorageKey(storeId) {

  return (
    "anarKalaCart_" +
    String(storeId)
  );

}


function getStoreCart(storeId) {

  try {

    const cart =
      JSON.parse(
        localStorage.getItem(
          getCartStorageKey(storeId)
        ) || "[]"
      );

    return Array.isArray(cart)
      ? cart
      : [];

  } catch {

    return [];

  }

}


function saveStoreCart(
  storeId,
  cart
) {

  if (
    !Array.isArray(cart) ||
    cart.length === 0
  ) {

    localStorage.removeItem(
      getCartStorageKey(storeId)
    );

    return;
  }

  localStorage.setItem(
    getCartStorageKey(storeId),
    JSON.stringify(cart)
  );

}


function getAllCartStoreIds() {

  const ids = [];

  for (
    let i = 0;
    i < localStorage.length;
    i++
  ) {

    const key =
      localStorage.key(i);

    if (
      !key ||
      !key.startsWith(
        "anarKalaCart_"
      )
    ) {
      continue;
    }

    const storeId =
      key.substring(
        "anarKalaCart_".length
      );

    if (!storeId) {
      continue;
    }

    const cart =
      getStoreCart(storeId);

    if (cart.length > 0) {

      ids.push(
        String(storeId)
      );

    }

  }

  return ids;

}


function getAllCartCount() {

  return getAllCartStoreIds()
    .reduce(
      (total, storeId) =>
        total +
        getCartCount(storeId),
      0
    );

}


function getAllCartTotal() {

  return getAllCartStoreIds()
    .reduce(
      (total, storeId) =>
        total +
        getCartTotal(storeId),
      0
    );

}


async function addToCart(
  storeId,
  productId
) {

  try {

    const store =
      await getStoreById(storeId);

    if (
      store &&
      store.isBlocked
    ) {

      alert(
        "این فروشگاه مسدود است و امکان خرید وجود ندارد."
      );

      return;
    }

    const products =
      await getProductsByStore(
        storeId
      );

    const product =
      products.find(
        item =>
          String(item.id) ===
          String(productId)
      );

    if (!product) {

      alert(
        "محصول پیدا نشد."
      );

      return;
    }

    const cart =
      getStoreCart(storeId);

    const existing =
      cart.find(
        item =>
          String(item.productId) ===
          String(product.id)
      );

    if (existing) {

      existing.quantity =
        Number(existing.quantity || 0) + 1;

    } else {

      cart.push({

        productId:
          String(product.id),

        name:
          product.name,

        price:
          Number(product.price) || 0,

        image:
          product.image || "",

        whatsapp:
          product.whatsapp || "",

        quantity:
          1

      });

    }

    saveStoreCart(
      storeId,
      cart
    );

    updateCartButton();
    updateGlobalCartButton();

    alert(
      "محصول به سبد خرید اضافه شد."
    );

  } catch (error) {

    console.error(
      "ADD TO CART ERROR:",
      error
    );

    alert(
      "افزودن به سبد خرید انجام نشد:\n\n" +
      error.message
    );

  }

}


function getCartCount(storeId) {

  return getStoreCart(storeId)
    .reduce(
      (total, item) =>
        total +
        Number(item.quantity || 0),
      0
    );

}


function getCartTotal(storeId) {

  return getStoreCart(storeId)
    .reduce(
      (total, item) =>
        total +
        (
          Number(item.price || 0) *
          Number(item.quantity || 0)
        ),
      0
    );

}


/* =====================================================
   دکمه سبد داخل فروشگاه
===================================================== */

function updateCartButton() {

  const storePage =
    document.getElementById(
      "storePage"
    );

  if (!storePage) {
    return;
  }

  const storeHeader =
    document.getElementById(
      "storeHeader"
    );

  if (!storeHeader) {
    return;
  }

  const oldButton =
    document.getElementById(
      "floatingCartButton"
    );

  if (oldButton) {
    oldButton.remove();
  }

  if (
    storePage.classList.contains(
      "hidden"
    )
  ) {
    return;
  }

  const storeId =
    window.currentAnarKalaStoreId;

  if (!storeId) {
    return;
  }

  const count =
    getCartCount(storeId);

  const button =
    document.createElement("button");

  button.id =
    "floatingCartButton";

  button.className =
    "mainBtn";

  button.type =
    "button";

  button.style.marginBottom =
    "15px";

  button.innerHTML =
    "🛒 سبد سفارش فروشگاه (" +
    toFaDigits(count) +
    ")";

  button.onclick =
    () => openCart(storeId);

  storeHeader.appendChild(
    button
  );

}


/* =====================================================
   دکمه عمومی سبد
===================================================== */

function updateGlobalCartButton() {

  const count =
    getAllCartCount();

  const possibleIds = [

    "buyerCartBtn",
    "globalCartButton",
    "allCartButton",
    "cartButton",
    "navbarCartButton"

  ];

  let button = null;

  for (
    let i = 0;
    i < possibleIds.length;
    i++
  ) {

    const element =
      document.getElementById(
        possibleIds[i]
      );

    if (element) {

      button = element;

      break;
    }
  }

  if (button) {

    button.innerHTML =
      "🛒 سبد سفارش" +
      (
        count > 0
          ? " (" + toFaDigits(count) + ")"
          : ""
      );

  }

}


/* =====================================================
   پیام سبد واتساپ
===================================================== */

async function buildCartWhatsappMessage(
  storeId
) {

  const cart =
    getStoreCart(storeId);

  if (!cart.length) {
    return null;
  }

  const store =
    await getStoreById(storeId);

  if (!store) {

    throw new Error(
      "فروشگاه پیدا نشد."
    );

  }

  if (store.isBlocked) {

    throw new Error(
      "این فروشگاه مسدود است."
    );

  }

  let message =
    "سلام، می‌خواهم سفارش زیر را ثبت کنم:\n\n";

  message +=
    "🏪 فروشگاه: " +
    store.name +
    "\n\n";

  cart.forEach(
    (item, index) => {

      const quantity =
        Number(item.quantity || 0);

      const price =
        Number(item.price || 0);

      const total =
        quantity * price;

      message +=
        (index + 1) +
        ". " +
        item.name +
        "\n";

      message +=
        "   🔢 تعداد: " +
        quantity +
        "\n";

      message +=
        "   💰 قیمت واحد: " +
        price.toLocaleString("fa-AF") +
        " افغانی\n";

      message +=
        "   💵 مجموع: " +
        total.toLocaleString("fa-AF") +
        " افغانی\n\n";

    }
  );

  const total =
    getCartTotal(storeId);

  message +=
    "💳 مجموع کل سفارش: " +
    total.toLocaleString("fa-AF") +
    " افغانی\n\n";

  message +=
    "لطفاً سفارش من را تأیید کنید.";

  return {

    message,

    whatsapp:
      getWhatsappNumber(
        cart[0]?.whatsapp,
        store.whatsapp
      )

  };

}


/* =====================================================
   ارسال سبد به واتساپ
===================================================== */

async function sendCartToWhatsapp(
  storeId
) {

  try {

    const cart =
      getStoreCart(storeId);

    if (!cart.length) {

      alert(
        "سبد خرید این فروشگاه خالی است."
      );

      return;
    }

    const data =
      await buildCartWhatsappMessage(
        storeId
      );

    if (!data) {
      return;
    }

    if (!data.whatsapp) {

      alert(
        "شماره واتساپ فروشنده ثبت نشده است."
      );

      return;
    }

    const opened =
      openWhatsapp(
        data.whatsapp,
        data.message
      );

    if (opened) {

      saveStoreCart(
        storeId,
        []
      );

      updateCartButton();
      updateGlobalCartButton();

      const modal =
        document.getElementById(
          "anarKalaCartModal"
        );

      if (modal) {
        modal.remove();
      }

      const allModal =
        document.getElementById(
          "anarKalaAllCartsModal"
        );

      if (allModal) {
        allModal.remove();
      }

    }

  } catch (error) {

    console.error(
      "SEND CART WHATSAPP ERROR:",
      error
    );

    alert(
      "ارسال سفارش انجام نشد:\n\n" +
      error.message
    );

  }

}


/* =====================================================
   سبد یک فروشگاه
===================================================== */

function openCart(storeId) {

  const cart =
    getStoreCart(storeId);

  const oldModal =
    document.getElementById(
      "anarKalaCartModal"
    );

  if (oldModal) {
    oldModal.remove();
  }

  const modal =
    document.createElement("div");

  modal.id =
    "anarKalaCartModal";

  modal.style.cssText = `
    position:fixed;
    inset:0;
    background:rgba(0,0,0,.55);
    z-index:99999;
    padding:20px;
    overflow-y:auto;
  `;

  let itemsHTML = "";

  if (!cart.length) {

    itemsHTML = `
      <div class="empty">
        سبد خرید این فروشگاه خالی است.
      </div>
    `;

  } else {

    itemsHTML =
      cart.map(item => {

        const itemTotal =
          Number(item.price || 0) *
          Number(item.quantity || 0);

        return `

          <div
            class="itemRow"
            style="
              margin-bottom:12px;
              padding:12px;
              border:1px solid #eee;
              border-radius:12px;
            ">

            ${
              item.image
                ? `
                  <img
                    src="${escapeHTML(item.image)}"
                    style="
                      width:70px;
                      height:70px;
                      object-fit:cover;
                      border-radius:10px;
                    "
                    alt="محصول">
                `
                : ""
            }

            <h4>
              ${escapeHTML(item.name)}
            </h4>

            <p>
              قیمت واحد:
              ${toFaDigits(item.price)}
              افغانی
            </p>

            <div>

              <button
                type="button"
                onclick="
                  changeCartQuantity(
                    '${escapeHTML(storeId)}',
                    '${escapeHTML(item.productId)}',
                    -1
                  )
                ">

                −

              </button>

              <strong
                style="
                  margin:0 12px;
                ">

                ${toFaDigits(item.quantity)}

              </strong>

              <button
                type="button"
                onclick="
                  changeCartQuantity(
                    '${escapeHTML(storeId)}',
                    '${escapeHTML(item.productId)}',
                    1
                  )
                ">

                +

              </button>

            </div>

            <p>

              مجموع:

              <strong>

                ${toFaDigits(itemTotal)}
                افغانی

              </strong>

            </p>

            <button
              class="deleteBtn"
              type="button"
              onclick="
                removeFromCart(
                  '${escapeHTML(storeId)}',
                  '${escapeHTML(item.productId)}'
                )
              ">

              🗑️ حذف

            </button>

          </div>

        `;

      }).join("");

  }

  const total =
    getCartTotal(storeId);

  modal.innerHTML = `

    <div
      style="
        max-width:600px;
        margin:30px auto;
        background:white;
        border-radius:18px;
        padding:20px;
        color:#222;
      ">

      <div
        style="
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:10px;
        ">

        <h2>
          🛒 سبد سفارش
        </h2>

        <button
          type="button"
          onclick="
            document
              .getElementById(
                'anarKalaCartModal'
              )
              .remove()
          ">

          ✕

        </button>

      </div>

      ${itemsHTML}

      ${
        cart.length
          ? `
            <hr>

            <h3>

              مجموع کل:
              ${toFaDigits(total)}
              افغانی

            </h3>

            <button
              class="mainBtn"
              type="button"
              style="
                background:#25D366;
                color:white;
                width:100%;
                margin-top:10px;
              "
              onclick="
                sendCartToWhatsapp(
                  '${escapeHTML(storeId)}'
                )
              ">

              🟢 ارسال سفارش به واتساپ

            </button>

            <p
              style="
                font-size:13px;
                color:#666;
                margin-top:10px;
                text-align:center;
              ">

              سفارش مستقیماً به واتساپ فروشنده ارسال می‌شود.

            </p>

          `
          : ""
      }

    </div>

  `;

  document.body.appendChild(modal);

}


/* =====================================================
   سبد همه فروشگاه‌ها
===================================================== */

async function openAllCarts() {

  const oldModal =
    document.getElementById(
      "anarKalaAllCartsModal"
    );

  if (oldModal) {
    oldModal.remove();
  }

  const storeIds =
    getAllCartStoreIds();

  const modal =
    document.createElement("div");

  modal.id =
    "anarKalaAllCartsModal";

  modal.style.cssText = `
    position:fixed;
    inset:0;
    background:rgba(0,0,0,.55);
    z-index:99999;
    padding:20px;
    overflow-y:auto;
  `;

  if (!storeIds.length) {

    modal.innerHTML = `

      <div
        style="
          max-width:600px;
          margin:40px auto;
          background:white;
          border-radius:18px;
          padding:25px;
          color:#222;
          text-align:center;
        ">

        <div
          style="
            display:flex;
            justify-content:space-between;
            align-items:center;
          ">

          <h2>
            🛒 سبد سفارش
          </h2>

          <button
            type="button"
            onclick="
              document
                .getElementById(
                  'anarKalaAllCartsModal'
                )
                .remove()
            ">

            ✕

          </button>

        </div>

        <div
          class="empty"
          style="
            margin-top:30px;
            padding:25px;
          ">

          🛒 سبد سفارش شما خالی است.

        </div>

      </div>

    `;

    document.body.appendChild(modal);

    return;
  }

  modal.innerHTML = `

    <div
      style="
        max-width:750px;
        margin:20px auto;
        background:white;
        border-radius:18px;
        padding:20px;
        color:#222;
      ">

      <div
        style="
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:10px;
          margin-bottom:15px;
        ">

        <h2>
          🛒 سبد سفارش شما
        </h2>

        <button
          type="button"
          onclick="
            document
              .getElementById(
                'anarKalaAllCartsModal'
              )
              .remove()
          ">

          ✕

        </button>

      </div>

      <div id="anarKalaAllCartsContent">

        <div
          style="
            text-align:center;
            padding:25px;
          ">

          در حال دریافت سبد سفارش...

        </div>

      </div>

    </div>

  `;

  document.body.appendChild(modal);

  const content =
    document.getElementById(
      "anarKalaAllCartsContent"
    );

  if (!content) {
    return;
  }

  let html = "";
  let grandTotal = 0;
  let grandCount = 0;

  for (const storeId of storeIds) {

    try {

      const store =
        await getStoreById(storeId);

      const cart =
        getStoreCart(storeId);

      if (!cart.length) {
        continue;
      }

      const storeName =
        store
          ? store.name
          : "فروشگاه";

      const storeWhatsapp =
        store
          ? store.whatsapp
          : "";

      const storeTotal =
        getCartTotal(storeId);

      const storeCount =
        getCartCount(storeId);

      grandTotal += storeTotal;
      grandCount += storeCount;

      html += `

        <div
          style="
            border:1px solid #e5e5e5;
            border-radius:16px;
            padding:15px;
            margin-bottom:18px;
            background:#fff;
          ">

          <div
            style="
              display:flex;
              justify-content:space-between;
              align-items:center;
              gap:10px;
              flex-wrap:wrap;
              margin-bottom:12px;
            ">

            <div>

              <h3
                style="
                  margin:0 0 5px;
                ">

                🏪
                ${escapeHTML(storeName)}

              </h3>

              <span
                style="
                  color:#666;
                  font-size:13px;
                ">

                ${toFaDigits(storeCount)}
                کالا

              </span>

            </div>

            <strong>

              ${toFaDigits(storeTotal)}
              افغانی

            </strong>

          </div>

      `;

      cart.forEach(item => {

        const quantity =
          Number(item.quantity || 0);

        const price =
          Number(item.price || 0);

        const itemTotal =
          quantity * price;

        html += `

          <div
            style="
              display:flex;
              gap:12px;
              align-items:center;
              padding:12px 0;
              border-top:1px solid #eee;
              flex-wrap:wrap;
            ">

            ${
              item.image
                ? `
                  <img
                    src="${escapeHTML(item.image)}"
                    style="
                      width:70px;
                      height:70px;
                      object-fit:cover;
                      border-radius:10px;
                    "
                    alt="محصول">
                `
                : `
                  <div
                    style="
                      width:70px;
                      height:70px;
                      border-radius:10px;
                      display:flex;
                      align-items:center;
                      justify-content:center;
                      background:#f4f4f4;
                      font-size:30px;
                    ">

                    📦

                  </div>
                `
            }

            <div
              style="
                flex:1;
                min-width:180px;
              ">

              <h4
                style="
                  margin:0 0 6px;
                ">

                ${escapeHTML(item.name)}

              </h4>

              <div
                style="
                  font-size:13px;
                  color:#666;
                ">

                قیمت واحد:
                ${toFaDigits(price)}
                افغانی

              </div>

              <div
                style="
                  margin-top:5px;
                ">

                مجموع:

                <strong>

                  ${toFaDigits(itemTotal)}
                  افغانی

                </strong>

              </div>

            </div>

            <div
              style="
                display:flex;
                align-items:center;
                gap:8px;
              ">

              <button
                type="button"
                onclick="
                  changeAllCartQuantity(
                    '${escapeHTML(storeId)}',
                    '${escapeHTML(item.productId)}',
                    -1
                  )
                "
                style="
                  width:35px;
                  height:35px;
                ">

                −

              </button>

              <strong>

                ${toFaDigits(quantity)}

              </strong>

              <button
                type="button"
                onclick="
                  changeAllCartQuantity(
                    '${escapeHTML(storeId)}',
                    '${escapeHTML(item.productId)}',
                    1
                  )
                "
                style="
                  width:35px;
                  height:35px;
                ">

                +

              </button>

            </div>

            <button
              type="button"
              class="deleteBtn"
              onclick="
                removeFromAllCarts(
                  '${escapeHTML(storeId)}',
                  '${escapeHTML(item.productId)}'
                )
              ">

              🗑️ حذف

            </button>

          </div>

        `;

      });

      html += `

          <div
            style="
              border-top:1px solid #eee;
              margin-top:5px;
              padding-top:12px;
            ">

            <div
              style="
                display:flex;
                justify-content:space-between;
                align-items:center;
                gap:10px;
                margin-bottom:10px;
              ">

              <strong>
                مجموع این فروشگاه:
              </strong>

              <strong>

                ${toFaDigits(storeTotal)}
                افغانی

              </strong>

            </div>

            <button
              class="mainBtn"
              type="button"
              style="
                background:#25D366;
                color:white;
                width:100%;
              "
              onclick="
                sendCartToWhatsapp(
                  '${escapeHTML(storeId)}'
                )
              ">

              🟢 ارسال سفارش این فروشگاه به واتساپ

            </button>

            ${
              !getWhatsappNumber(
                cart[0]?.whatsapp,
                storeWhatsapp
              )
                ? `
                  <p
                    style="
                      color:#c00;
                      font-size:13px;
                      text-align:center;
                      margin:8px 0 0;
                    ">

                    شماره واتساپ این فروشگاه ثبت نشده است.

                  </p>
                `
                : ""
            }

          </div>

        </div>

      `;

    } catch (error) {

      console.error(
        "ALL CART STORE ERROR:",
        error
      );

      html += `

        <div
          style="
            border:1px solid #f0cccc;
            border-radius:12px;
            padding:12px;
            margin-bottom:12px;
            color:#a00;
          ">

          دریافت اطلاعات یک فروشگاه انجام نشد.

        </div>

      `;

    }

  }

  if (!html) {

    html = `

      <div class="empty">

        🛒 سبد سفارش شما خالی است.

      </div>

    `;

  }

  html += `

    <div
      style="
        border-top:2px solid #ddd;
        margin-top:10px;
        padding-top:18px;
      ">

      <div
        style="
          display:flex;
          justify-content:space-between;
          align-items:center;
          margin-bottom:8px;
        ">

        <strong>
          تعداد کل کالاها:
        </strong>

        <strong>

          ${toFaDigits(grandCount)}

        </strong>

      </div>

      <div
        style="
          display:flex;
          justify-content:space-between;
          align-items:center;
          font-size:18px;
        ">

        <strong>
          مجموع کل:
        </strong>

        <strong>

          ${toFaDigits(grandTotal)}
          افغانی

        </strong>

      </div>

      <p
        style="
          font-size:13px;
          color:#666;
          text-align:center;
          margin-top:12px;
        ">

        سفارش هر فروشگاه جداگانه به واتساپ همان فروشگاه ارسال می‌شود.

      </p>

    </div>

  `;

  content.innerHTML = html;

}


/* =====================================================
   تغییر و حذف سبد
===================================================== */

function changeAllCartQuantity(
  storeId,
  productId,
  change
) {

  const cart =
    getStoreCart(storeId);

  const item =
    cart.find(
      product =>
        String(product.productId) ===
        String(productId)
    );

  if (!item) {
    return;
  }

  item.quantity =
    Number(item.quantity || 0) +
    Number(change);

  if (item.quantity <= 0) {

    const index =
      cart.indexOf(item);

    cart.splice(index, 1);
  }

  saveStoreCart(
    storeId,
    cart
  );

  updateCartButton();
  updateGlobalCartButton();

  openAllCarts();

}


function removeFromAllCarts(
  storeId,
  productId
) {

  const cart =
    getStoreCart(storeId);

  const filtered =
    cart.filter(
      item =>
        String(item.productId) !==
        String(productId)
    );

  saveStoreCart(
    storeId,
    filtered
  );

  updateCartButton();
  updateGlobalCartButton();

  openAllCarts();

}


function changeCartQuantity(
  storeId,
  productId,
  change
) {

  const cart =
    getStoreCart(storeId);

  const item =
    cart.find(
      product =>
        String(product.productId) ===
        String(productId)
    );

  if (!item) {
    return;
  }

  item.quantity +=
    Number(change);

  if (item.quantity <= 0) {

    const index =
      cart.indexOf(item);

    cart.splice(index, 1);

  }

  saveStoreCart(
    storeId,
    cart
  );

  updateCartButton();
  updateGlobalCartButton();

  openCart(storeId);

}


function removeFromCart(
  storeId,
  productId
) {

  const cart =
    getStoreCart(storeId);

  const filtered =
    cart.filter(
      item =>
        String(item.productId) !==
        String(productId)
    );

  saveStoreCart(
    storeId,
    filtered
  );

  updateCartButton();
  updateGlobalCartButton();

  openCart(storeId);

}


/* =====================================================
   احراز هویت
===================================================== */

function openAuth() {

  hideAllPages();

  const authPage =
    document.getElementById(
      "authPage"
    );

  if (authPage) {

    authPage.classList.remove(
      "hidden"
    );
  }

  showLogin();

}


function showLogin() {

  const loginBox =
    document.getElementById(
      "loginBox"
    );

  const registerBox =
    document.getElementById(
      "registerBox"
    );

  if (loginBox) {

    loginBox.classList.remove(
      "hidden"
    );

  }

  if (registerBox) {

    registerBox.classList.add(
      "hidden"
    );

  }

  ensureForgotPasswordBox();

}


function showRegister() {

  const loginBox =
    document.getElementById(
      "loginBox"
    );

  const registerBox =
    document.getElementById(
      "registerBox"
    );

  if (loginBox) {

    loginBox.classList.add(
      "hidden"
    );

  }

  if (registerBox) {

    registerBox.classList.remove(
      "hidden"
    );

  }

}


/* =====================================================
   فراموشی رمز عبور
===================================================== */

function ensureForgotPasswordBox() {

  const loginBox =
    document.getElementById(
      "loginBox"
    );

  if (!loginBox) {
    return;
  }

  if (
    document.getElementById(
      "forgotPasswordButton"
    )
  ) {
    return;
  }

  const wrapper =
    document.createElement("div");

  wrapper.style.cssText = `
    margin-top:12px;
    text-align:center;
  `;

  wrapper.innerHTML = `

    <button
      id="forgotPasswordButton"
      type="button"
      style="
        background:none;
        border:none;
        color:#b5122b;
        cursor:pointer;
        text-decoration:underline;
        font-size:14px;
      "
      onclick="openForgotPassword()">

      🔑 رمز خود را فراموش کردم

    </button>

  `;

  loginBox.appendChild(wrapper);

}


function openForgotPassword() {

  const old =
    document.getElementById(
      "forgotPasswordModal"
    );

  if (old) {
    old.remove();
  }

  const modal =
    document.createElement("div");

  modal.id =
    "forgotPasswordModal";

  modal.style.cssText = `
    position:fixed;
    inset:0;
    background:rgba(0,0,0,.55);
    z-index:100000;
    padding:20px;
    overflow-y:auto;
  `;

  modal.innerHTML = `

    <div
      style="
        max-width:480px;
        margin:50px auto;
        background:#fff;
        border-radius:18px;
        padding:22px;
        color:#222;
      ">

      <div
        style="
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:10px;
        ">

        <h2>
          🔑 فراموشی رمز عبور
        </h2>

        <button
          type="button"
          onclick="
            document
              .getElementById(
                'forgotPasswordModal'
              )
              .remove()
          ">

          ✕

        </button>

      </div>

      <p>

        شماره تماس خود را وارد کنید.
        درخواست تغییر رمز برای مالک سایت ارسال می‌شود.

      </p>

      <input
        id="forgotPasswordPhone"
        type="tel"
        placeholder="شماره تماس"
        style="
          width:100%;
          margin:10px 0;
        ">

      <button
        type="button"
        class="mainBtn"
        style="width:100%;"
        onclick="submitForgotPassword()">

        ارسال درخواست

      </button>

    </div>

  `;

  document.body.appendChild(modal);

}


async function submitForgotPassword() {

  const input =
    document.getElementById(
      "forgotPasswordPhone"
    );

  if (!input) {
    return;
  }

  const phone =
    normalizePhone(
      input.value
    );

  if (!phone) {

    alert(
      "شماره تماس را وارد کنید."
    );

    return;
  }

  if (
    phone ===
    normalizePhone(OWNER.phone)
  ) {

    alert(
      "برای تغییر رمز مالک از بخش مدیریت استفاده کنید."
    );

    return;
  }

  try {

    /*
       ابتدا درخواست عمومی کاربران ثبت می‌شود.
       این RPC خودش کاربر واقعی را پیدا می‌کند.
    */

    const result =
      await supabaseRpc(
        "request_password_reset",
        {
          p_phone: phone
        }
      );

    console.log(
      "PASSWORD RESET REQUEST:",
      result
    );

    alert(
      "درخواست شما برای مالک سایت ارسال شد.\n\n" +
      "مالک می‌تواند رمز موقت برای شما تعیین کند."
    );

    const modal =
      document.getElementById(
        "forgotPasswordModal"
      );

    if (modal) {
      modal.remove();
    }

  } catch (error) {

    console.error(
      "FORGOT PASSWORD ERROR:",
      error
    );

    alert(
      "ارسال درخواست انجام نشد:\n\n" +
      error.message
    );

  }

}


/* =====================================================
   ثبت‌نام
===================================================== */

async function registerUser() {

  const name =
    document
      .getElementById("registerName")
      .value
      .trim();

  const phone =
    normalizePhone(
      document
        .getElementById("registerPhone")
        .value
    );

  const password =
    document
      .getElementById("registerPassword")
      .value;

  const type =
    document
      .getElementById("registerType")
      .value;

  if (
    !name ||
    !phone ||
    !password
  ) {

    alert(
      "لطفاً همه اطلاعات را وارد کنید."
    );

    return;
  }

  if (password.length < 6) {

    alert(
      "رمز عبور باید حداقل ۶ کاراکتر باشد."
    );

    return;
  }

  if (
    phone ===
    normalizePhone(OWNER.phone)
  ) {

    alert(
      "این شماره متعلق به مالک اصلی سایت است."
    );

    return;
  }

  const safeType =
    type === "seller"
      ? "seller"
      : "buyer";

  try {

    await supabaseRpc(
      "register_user",
      {
        p_name: name,
        p_phone: phone,
        p_password: password,
        p_type: safeType
      }
    );

    alert(
      "ثبت‌نام با موفقیت انجام شد."
    );

    const loginPhone =
      document.getElementById(
        "loginPhone"
      );

    const loginPassword =
      document.getElementById(
        "loginPassword"
      );

    if (loginPhone) {
      loginPhone.value = phone;
    }

    if (loginPassword) {
      loginPassword.value = password;
    }

    const registerName =
      document.getElementById(
        "registerName"
      );

    const registerPhone =
      document.getElementById(
        "registerPhone"
      );

    const registerPassword =
      document.getElementById(
        "registerPassword"
      );

    if (registerName) {
      registerName.value = "";
    }

    if (registerPhone) {
      registerPhone.value = "";
    }

    if (registerPassword) {
      registerPassword.value = "";
    }

    showLogin();

  } catch (error) {

    console.error(
      "REGISTER ERROR:",
      error
    );

    alert(
      "خطای ثبت‌نام:\n\n" +
      error.message
    );

  }

}


/* =====================================================
   ورود
===================================================== */

async function loginUser() {

  const phoneInput =
    document.getElementById(
      "loginPhone"
    );

  const passwordInput =
    document.getElementById(
      "loginPassword"
    );

  const phone =
    normalizePhone(
      phoneInput
        ? phoneInput.value
        : ""
    );

  const password =
    passwordInput
      ? passwordInput.value
      : "";

  if (!phone || !password) {

    alert(
      "شماره تماس و رمز عبور را وارد کنید."
    );

    return;
  }


  /* ===================================================
     مالک
  =================================================== */

  if (
    phone ===
    normalizePhone(OWNER.phone)
  ) {

    try {

      const owner =
        await supabaseRpc(
          "login_owner",
          {
            p_phone: phone,
            p_password: password
          }
        );

      const ownerUser = {

        id:
          owner.id,

        name:
          owner.name,

        phone:
          owner.phone,

        type:
          "admin",

        token:
          owner.token

      };

      setCurrentUser(ownerUser);

      if (phoneInput) {
        phoneInput.value = "";
      }

      if (passwordInput) {
        passwordInput.value = "";
      }

      await openAdminPanel();

      return;

    } catch (error) {

      console.error(
        "OWNER LOGIN ERROR:",
        error
      );

      alert(
        "رمز مالک اشتباه است."
      );

      return;
    }

  }


  /* ===================================================
     خریدار / فروشنده
  =================================================== */

  try {

    const user =
      await supabaseRpc(
        "login_user",
        {
          p_phone: phone,
          p_password: password
        }
      );

    if (!user) {

      alert(
        "حساب کاربری پیدا نشد."
      );

      return;
    }

    if (
      user.type !== "buyer" &&
      user.type !== "seller"
    ) {

      alert(
        "حساب کاربری نامعتبر است."
      );

      return;
    }

    /*
       اگر نسخه RPC وضعیت مسدودی را هم برگرداند،
       قبل از ورود آن را بررسی می‌کنیم.
    */

    if (
      isBlockedValue(
        user.is_blocked ??
        user.isBlocked
      )
    ) {

      alert(
        "حساب شما توسط مالک سایت مسدود شده است."
      );

      return;
    }

    const currentUser = {

      id:
        String(user.id),

      name:
        user.name,

      phone:
        user.phone,

      type:
        user.type

    };

    setCurrentUser(currentUser);

    if (phoneInput) {
      phoneInput.value = "";
    }

    if (passwordInput) {
      passwordInput.value = "";
    }

    if (user.type === "seller") {

      await openSellerPanel();

    } else {

      await showHome();

    }

  } catch (error) {

    console.error(
      "LOGIN ERROR:",
      error
    );

    /*
       اگر RPC جدید خطای مسدود بودن برگرداند،
       همان پیام را به کاربر نشان می‌دهیم.
    */

    const errorText =
      String(
        error?.message || ""
      );

    if (
      errorText.includes("مسدود") ||
      errorText.toLowerCase().includes("blocked")
    ) {

      alert(
        "حساب شما توسط مالک سایت مسدود شده است."
      );

      return;
    }

    alert(
      "شماره تماس یا رمز عبور اشتباه است."
    );

  }

}


/* =====================================================
   خروج
===================================================== */

function logout() {

  localStorage.removeItem(
    STORAGE.currentUser
  );

  localStorage.removeItem(
    STORAGE.ownerToken
  );

  selectedCategories = [];

  window.currentAnarKalaStoreId = "";

  showHome();

}


/* =====================================================
   پنل فروشنده
===================================================== */

async function openSellerPanel() {

  const user =
    getCurrentUser();

  if (
    !user ||
    user.type !== "seller"
  ) {

    alert(
      "ابتدا با حساب فروشنده وارد شوید."
    );

    openAuth();

    return;
  }

  hideAllPages();

  const sellerPage =
    document.getElementById(
      "sellerPage"
    );

  if (sellerPage) {

    sellerPage.classList.remove(
      "hidden"
    );
  }

  await renderSellerPanel();

}


async function renderSellerPanel() {

  const user =
    getCurrentUser();

  if (
    !user ||
    user.type !== "seller"
  ) {

    return;
  }

  try {

    const stores =
      await getStores();

    const store =
      stores.find(
        item =>
          item.ownerId ===
          String(user.id)
      );

    const content =
      document.getElementById(
        "sellerContent"
      );

    if (!content) {
      return;
    }

    if (!store) {

      content.innerHTML = `

        <div class="panelBox">

          <h3>
            ساخت فروشگاه
          </h3>

          <p>
            ابتدا اطلاعات فروشگاه خود را وارد کنید.
          </p>

          <div class="formGrid">

            <input
              id="sellerStoreName"
              placeholder="نام فروشگاه">

            <input
              id="sellerStorePhone"
              placeholder="شماره تماس">

            <input
              id="sellerStoreWhatsapp"
              placeholder="شماره واتساپ">

            <select
              id="sellerStoreCategory">

              <option value="">
                انتخاب دسته
              </option>

              ${getCategoryOptions()}

            </select>

            <textarea
              id="sellerStoreDescription"
              class="full"
              placeholder="توضیحات فروشگاه"></textarea>

            <div class="full">

              <label>
                لوگوی فروشگاه
              </label>

              <input
                id="sellerStoreLogo"
                type="file"
                accept="image/*">

              <p class="uploadHint">
                حداکثر حجم 5MB.
              </p>

            </div>

          </div>

          <button
            class="mainBtn"
            onclick="createStore()">

            ساخت فروشگاه

          </button>

        </div>

      `;

      return;
    }

    await renderSellerDashboard(
      user,
      store
    );

  } catch (error) {

    console.error(
      "SELLER PANEL ERROR:",
      error
    );

    alert(
      "خطای پنل فروشنده:\n\n" +
      error.message
    );

  }

}


async function renderSellerDashboard(
  user,
  store
) {

  const products =
    await getProductsByStore(
      store.id
    );

  const myProducts =
    products.filter(
      product =>
        product.ownerId ===
        String(user.id)
    );

  const logo =
    store.logo || "";

  const content =
    document.getElementById(
      "sellerContent"
    );

  if (!content) {
    return;
  }

  content.innerHTML = `

    ${
      store.isBlocked
        ? `
          <div
            class="panelBox"
            style="
              border:2px solid #b5122b;
            ">

            <h3 style="color:#b5122b;">
              ⚠️ فروشگاه شما مسدود شده است
            </h3>

            <p>
              فروشگاه تا زمانی که مالک سایت آن را فعال نکند،
              برای عموم قابل مشاهده نیست.
            </p>

          </div>
        `
        : ""
    }

    <div class="panelBox">

      <h3>
        فروشگاه من
      </h3>

      ${
        logo
          ? `
            <img
              src="${escapeHTML(logo)}"
              class="previewImage"
              alt="لوگو">
          `
          : ""
      }

      <p>

        نام:

        <strong>
          ${escapeHTML(store.name)}
        </strong>

      </p>

      <p>

        دسته:

        ${escapeHTML(
          getCategoryName(store.category)
        )}

      </p>

    </div>

    <div class="panelBox">

      <h3>
        ویرایش اطلاعات فروشگاه
      </h3>

      <div class="formGrid">

        <input
          id="editStoreName"
          value="${escapeHTML(store.name)}"
          placeholder="نام فروشگاه">

        <input
          id="editStorePhone"
          value="${escapeHTML(store.phone || "")}"
          placeholder="شماره تماس">

        <input
          id="editStoreWhatsapp"
          value="${escapeHTML(store.whatsapp || "")}"
          placeholder="واتساپ">

        <select
          id="editStoreCategory">

          ${getCategoryOptions(store.category)}

        </select>

        <textarea
          id="editStoreDescription"
          class="full"
          placeholder="توضیحات">${escapeHTML(
            store.description || ""
          )}</textarea>

        <div class="full">

          <label>
            تغییر لوگوی فروشگاه
          </label>

          <input
            id="editStoreLogo"
            type="file"
            accept="image/*">

          <p class="uploadHint">
            حداکثر 5MB.
          </p>

        </div>

      </div>

      <button
        class="mainBtn"
        onclick="
          updateStore('${store.id}')
        ">

        ذخیره تغییرات فروشگاه

      </button>

    </div>

    <div class="panelBox">

      <h3>
        افزودن محصول جدید
      </h3>

      <div class="formGrid">

        <input
          id="productName"
          placeholder="نام محصول">

        <input
          id="productPrice"
          type="number"
          placeholder="قیمت به افغانی">

        <input
          id="productWhatsapp"
          placeholder="شماره واتساپ">

        <div>

          <label>
            عکس محصول
          </label>

          <input
            id="productImage"
            type="file"
            accept="image/*">

          <p class="uploadHint">
            حداکثر حجم 5MB.
          </p>

        </div>

        <textarea
          id="productDescription"
          class="full"
          placeholder="توضیحات محصول"></textarea>

      </div>

      <button
        class="mainBtn"
        onclick="
          addProduct('${store.id}')
        ">

        افزودن محصول

      </button>

    </div>

    <div class="panelBox">

      <h3>
        محصولات من
      </h3>

      <div id="sellerProducts"></div>

    </div>

  `;

  renderSellerProducts(myProducts);

}


/* =====================================================
   ساخت فروشگاه
===================================================== */

async function createStore() {

  const user =
    getCurrentUser();

  if (
    !user ||
    user.type !== "seller"
  ) {

    alert(
      "دسترسی غیرمجاز."
    );

    return;
  }

  const name =
    document
      .getElementById("sellerStoreName")
      .value
      .trim();

  const phone =
    document
      .getElementById("sellerStorePhone")
      .value
      .trim();

  const whatsapp =
    document
      .getElementById("sellerStoreWhatsapp")
      .value
      .trim();

  const category =
    document
      .getElementById("sellerStoreCategory")
      .value;

  const description =
    document
      .getElementById("sellerStoreDescription")
      .value
      .trim();

  const imageInput =
    document.getElementById(
      "sellerStoreLogo"
    );

  if (!name || !category) {

    alert(
      "نام فروشگاه و دسته را وارد کنید."
    );

    return;
  }

  try {

    const stores =
      await getStores();

    const alreadyHasStore =
      stores.some(
        store =>
          store.ownerId ===
          String(user.id)
      );

    if (alreadyHasStore) {

      alert(
        "شما قبلاً فروشگاه ساخته‌اید."
      );

      await renderSellerPanel();

      return;
    }

    const logo =
      await uploadFileToStorage(
        imageInput,
        "store-logos"
      );

    await supabaseRequest(
      "stores",
      {
        method: "POST",

        body: {

          name,

          description,

          phone,

          whatsapp,

          category:
            normalizeCategoryKey(
              category
            ),

          logo_url:
            logo,

          seller_id:
            Number(user.id)

        }
      }
    );

    alert(
      "فروشگاه با موفقیت ساخته شد."
    );

    await renderSellerPanel();

  } catch (error) {

    console.error(
      "CREATE STORE ERROR:",
      error
    );

    alert(
      "خطای ساخت فروشگاه:\n\n" +
      error.message
    );

  }

}


/* =====================================================
   ویرایش فروشگاه
===================================================== */

async function updateStore(storeId) {

  const user =
    getCurrentUser();

  if (
    !user ||
    user.type !== "seller"
  ) {

    alert(
      "دسترسی غیرمجاز."
    );

    return;
  }

  const name =
    document
      .getElementById("editStoreName")
      .value
      .trim();

  const phone =
    document
      .getElementById("editStorePhone")
      .value
      .trim();

  const whatsapp =
    document
      .getElementById("editStoreWhatsapp")
      .value
      .trim();

  const category =
    document
      .getElementById("editStoreCategory")
      .value;

  const description =
    document
      .getElementById("editStoreDescription")
      .value
      .trim();

  const imageInput =
    document.getElementById(
      "editStoreLogo"
    );

  if (!name || !category) {

    alert(
      "نام فروشگاه و دسته را وارد کنید."
    );

    return;
  }

  try {

    const currentStore =
      await getStoreById(storeId);

    if (!currentStore) {

      alert(
        "فروشگاه پیدا نشد."
      );

      return;
    }

    if (
      currentStore.ownerId !==
      String(user.id)
    ) {

      alert(
        "شما مالک این فروشگاه نیستید."
      );

      return;
    }

    let logo =
      currentStore.logo || "";

    if (
      imageInput &&
      imageInput.files &&
      imageInput.files[0]
    ) {

      logo =
        await uploadFileToStorage(
          imageInput,
          "store-logos"
        );

    }

    await supabaseRequest(
      "stores",
      {
        method: "PATCH",

        query:
          "?id=eq." +
          encodeURIComponent(storeId),

        body: {

          name,

          phone,

          whatsapp,

          category:
            normalizeCategoryKey(
              category
            ),

          description,

          logo_url:
            logo

        }
      }
    );

    alert(
      "اطلاعات فروشگاه ذخیره شد."
    );

    await renderSellerPanel();

  } catch (error) {

    console.error(
      "UPDATE STORE ERROR:",
      error
    );

    alert(
      "خطای ذخیره تغییرات:\n\n" +
      error.message
    );

  }

}


/* =====================================================
   افزودن محصول
===================================================== */

async function addProduct(storeId) {

  const user =
    getCurrentUser();

  if (
    !user ||
    user.type !== "seller"
  ) {

    alert(
      "دسترسی غیرمجاز."
    );

    return;
  }

  try {

    const store =
      await getStoreById(storeId);

    if (
      !store ||
      store.ownerId !==
      String(user.id)
    ) {

      alert(
        "شما مالک این فروشگاه نیستید."
      );

      return;
    }

    const name =
      document
        .getElementById("productName")
        .value
        .trim();

    const price =
      document
        .getElementById("productPrice")
        .value
        .trim();

    const whatsapp =
      document
        .getElementById("productWhatsapp")
        .value
        .trim();

    const description =
      document
        .getElementById("productDescription")
        .value
        .trim();

    const imageInput =
      document.getElementById(
        "productImage"
      );

    if (!name || !price) {

      alert(
        "نام و قیمت محصول را وارد کنید."
      );

      return;
    }

    const numericPrice =
      Number(price);

    if (
      !Number.isFinite(numericPrice) ||
      numericPrice < 0
    ) {

      alert(
        "قیمت محصول معتبر نیست."
      );

      return;
    }

    const image =
      await uploadFileToStorage(
        imageInput,
        "product-images"
      );

    await supabaseRequest(
      "products",
      {
        method: "POST",

        body: {

          name,

          price:
            numericPrice,

          description,

          whatsapp,

          image_url:
            image,

          store_id:
            Number(storeId),

          owner_id:
            Number(user.id)

        }
      }
    );

    alert(
      "محصول با موفقیت اضافه شد."
    );

    await renderSellerPanel();

  } catch (error) {

    console.error(
      "ADD PRODUCT ERROR:",
      error
    );

    alert(
      "خطای افزودن محصول:\n\n" +
      error.message
    );

  }

}


/* =====================================================
   محصولات فروشنده
===================================================== */

function renderSellerProducts(products) {

  const container =
    document.getElementById(
      "sellerProducts"
    );

  if (!container) {
    return;
  }

  container.innerHTML = "";

  if (!products.length) {

    container.innerHTML = `
      <div class="empty">
        هنوز محصولی اضافه نکرده‌اید.
      </div>
    `;

    return;
  }

  products.forEach(product => {

    const row =
      document.createElement("div");

    row.className =
      "itemRow";

    row.innerHTML = `

      ${
        product.image
          ? `
            <img
              src="${escapeHTML(product.image)}"
              class="previewImage"
              alt="محصول">
          `
          : ""
      }

      <h4>
        ${escapeHTML(product.name)}
      </h4>

      <p>
        قیمت:
        ${escapeHTML(product.price)}
        افغانی
      </p>

      <p>
        ${escapeHTML(
          product.description || ""
        )}
      </p>

      <button
        class="deleteBtn"
        onclick="
          deleteProduct('${escapeHTML(product.id)}')
        ">

        حذف محصول

      </button>

    `;

    container.appendChild(row);

  });

}


/* =====================================================
   حذف محصول فروشنده
===================================================== */

async function deleteProduct(productId) {

  const user =
    getCurrentUser();

  if (
    !user ||
    user.type !== "seller"
  ) {

    alert(
      "دسترسی غیرمجاز."
    );

    return;
  }

  if (
    !confirm(
      "آیا از حذف این محصول مطمئن هستید؟"
    )
  ) {

    return;
  }

  try {

    await supabaseRequest(
      "products",
      {
        method: "DELETE",

        query:
          "?id=eq." +
          encodeURIComponent(productId) +
          "&owner_id=eq." +
          encodeURIComponent(user.id)
      }
    );

    alert(
      "محصول حذف شد."
    );

    await renderSellerPanel();

  } catch (error) {

    console.error(
      "DELETE PRODUCT ERROR:",
      error
    );

    alert(
      "خطای حذف محصول:\n\n" +
      error.message
    );

  }

}


/* =====================================================
   پنل مدیریت
===================================================== */

async function openAdminPanel() {

  const user =
    getCurrentUser();

  if (!isOwner(user)) {

    alert(
      "فقط مالک اصلی سایت اجازه ورود به مدیریت را دارد."
    );

    openAuth();

    return;
  }

  const token =
    getOwnerToken();

  if (!token) {

    alert(
      "جلسه مالک پیدا نشد. دوباره وارد شوید."
    );

    openAuth();

    return;
  }

  try {

    const result =
      await supabaseRpc(
        "verify_owner_token",
        {
          p_token: token
        }
      );

    if (result !== true) {

      localStorage.removeItem(
        STORAGE.ownerToken
      );

      localStorage.removeItem(
        STORAGE.currentUser
      );

      alert(
        "جلسه مالک منقضی یا نامعتبر است."
      );

      openAuth();

      return;
    }

    hideAllPages();

    const adminPage =
      document.getElementById(
        "adminPage"
      );

    if (adminPage) {

      adminPage.classList.remove(
        "hidden"
      );
    }

    await renderAdminPanel();

  } catch (error) {

    console.error(
      "OPEN ADMIN ERROR:",
      error
    );

    alert(
      "خطا در بررسی دسترسی مالک:\n\n" +
      error.message
    );

  }

}


/* =====================================================
   پنل مدیریت اصلی
===================================================== */

async function renderAdminPanel() {

  const access =
    await requireOwnerAccess();

  if (!access) {
    return;
  }

  try {

    const users =
      await getUsers();

    const stores =
      await getStores();

    const products =
      await getProducts();

    let visitorStats = null;
    let storeVisitorStats = [];

    try {

      visitorStats =
        await getVisitorStats();

    } catch (error) {

      console.error(
        "VISITOR STATS ERROR:",
        error
      );

    }

    try {

      storeVisitorStats =
        await getAllStoreVisitorStats();

    } catch (error) {

      console.error(
        "STORE VISITOR STATS ERROR:",
        error
      );

    }

    const content =
      document.getElementById(
        "adminContent"
      );

    if (!content) {
      return;
    }

    const totalVisitors =
      getStatValue(
        visitorStats,
        [
          "total",
          "total_visits",
          "total_visitors",
          "all"
        ]
      );

    const todayVisitors =
      getStatValue(
        visitorStats,
        [
          "today",
          "today_visits",
          "today_visitors"
        ]
      );

    const monthVisitors =
      getStatValue(
        visitorStats,
        [
          "month",
          "month_visits",
          "month_visitors",
          "this_month"
        ]
      );

    content.innerHTML = `

      <div class="panelBox">

        <h3>
          🔐 تغییر رمز مالک
        </h3>

        <p>
          برای تغییر رمز، رمز فعلی و رمز جدید را وارد کنید.
        </p>

        <input
          id="ownerCurrentPassword"
          type="password"
          placeholder="رمز فعلی">

        <input
          id="ownerNewPassword"
          type="password"
          placeholder="رمز جدید">

        <input
          id="ownerNewPassword2"
          type="password"
          placeholder="تکرار رمز جدید">

        <button
          class="mainBtn"
          onclick="
            changeOwnerPassword()
          ">

          تغییر رمز مالک

        </button>

      </div>


      <div class="panelBox">

        <h3>
          📊 آمار سایت
        </h3>

        <span class="adminStat">

          کاربران:
          ${toFaDigits(users.length)}

        </span>

        <span class="adminStat">

          فروشگاه‌ها:
          ${toFaDigits(stores.length)}

        </span>

        <span class="adminStat">

          محصولات:
          ${toFaDigits(products.length)}

        </span>

        <div
          style="
            margin-top:15px;
            display:grid;
            grid-template-columns:
              repeat(auto-fit,minmax(150px,1fr));
            gap:10px;
          ">

          <div
            class="adminStat"
            style="
              display:block;
              margin:0;
            ">

            👁️ بازدید کل

            <strong
              style="
                display:block;
                font-size:22px;
                margin-top:5px;
              ">

              ${toFaDigits(totalVisitors)}

            </strong>

          </div>

          <div
            class="adminStat"
            style="
              display:block;
              margin:0;
            ">

            📅 بازدید امروز

            <strong
              style="
                display:block;
                font-size:22px;
                margin-top:5px;
              ">

              ${toFaDigits(todayVisitors)}

            </strong>

          </div>

          <div
            class="adminStat"
            style="
              display:block;
              margin:0;
            ">

            📆 بازدید این ماه

            <strong
              style="
                display:block;
                font-size:22px;
                margin-top:5px;
              ">

              ${toFaDigits(monthVisitors)}

            </strong>

          </div>

        </div>

        <p
          style="
            color:#777;
            font-size:12px;
            margin-top:10px;
          ">

          آمار بر اساس بازدیدهای ثبت‌شده در سامانه است.

        </p>

      </div>


      <div class="panelBox">

        <h3>
          🔑 درخواست‌های فراموشی رمز
        </h3>

        <div id="adminPasswordRequests">

          در حال دریافت درخواست‌ها...

        </div>

      </div>


      <div class="panelBox">

        <h3>
          مدیریت فروشگاه‌ها
        </h3>

        <div id="adminStores"></div>

      </div>


      <div class="panelBox">

        <h3>
          📊 آمار بازدید فروشگاه‌ها
        </h3>

        <div id="adminStoreVisitorStats"></div>

      </div>


      <div class="panelBox">

        <h3>
          مدیریت محصولات
        </h3>

        <div id="adminProducts"></div>

      </div>


      <div class="panelBox">

        <h3>
          کاربران ثبت‌نام‌شده
        </h3>

        <div id="adminUsers"></div>

      </div>

    `;

    renderAdminStores(stores);

    renderAdminProducts(products);

    renderAdminUsers(users);

    renderAdminStoreVisitorStats(
      stores,
      storeVisitorStats
    );

    await renderAdminPasswordRequests();

  } catch (error) {

    console.error(
      "ADMIN PANEL ERROR:",
      error
    );

    alert(
      "خطای دریافت اطلاعات مدیریت:\n\n" +
      error.message
    );

  }

}


/* =====================================================
   کمک برای خواندن آمار RPC
===================================================== */

function getStatValue(
  data,
  keys
) {

  if (
    data === null ||
    data === undefined
  ) {
    return 0;
  }

  let source = data;

  if (
    Array.isArray(data)
  ) {

    source =
      data[0] || {};

  }

  if (
    typeof source === "number"
  ) {

    return Number(source) || 0;

  }

  if (
    typeof source === "string"
  ) {

    const n =
      Number(source);

    return Number.isFinite(n)
      ? n
      : 0;

  }

  if (
    typeof source === "object"
  ) {

    for (
      const key of keys
    ) {

      if (
        source[key] !== undefined &&
        source[key] !== null
      ) {

        const n =
          Number(source[key]);

        if (Number.isFinite(n)) {
          return n;
        }

      }

    }

  }

  return 0;
}


/* =====================================================
   تغییر رمز مالک
===================================================== */

async function changeOwnerPassword() {

  const access =
    await requireOwnerAccess();

  if (!access) {
    return;
  }

  const current =
    document
      .getElementById(
        "ownerCurrentPassword"
      )
      .value;

  const newPassword =
    document
      .getElementById(
        "ownerNewPassword"
      )
      .value;

  const newPassword2 =
    document
      .getElementById(
        "ownerNewPassword2"
      )
      .value;

  if (!current) {

    alert(
      "رمز فعلی را وارد کنید."
    );

    return;
  }

  if (newPassword.length < 6) {

    alert(
      "رمز جدید باید حداقل ۶ کاراکتر باشد."
    );

    return;
  }

  if (newPassword !== newPassword2) {

    alert(
      "تکرار رمز جدید یکسان نیست."
    );

    return;
  }

  try {

    await supabaseRpc(
      "change_owner_password",
      {
        p_phone:
          OWNER.phone,

        p_current_password:
          current,

        p_new_password:
          newPassword
      }
    );

    alert(
      "رمز مالک با موفقیت تغییر کرد."
    );

    document
      .getElementById(
        "ownerCurrentPassword"
      )
      .value = "";

    document
      .getElementById(
        "ownerNewPassword"
      )
      .value = "";

    document
      .getElementById(
        "ownerNewPassword2"
      )
      .value = "";

  } catch (error) {

    console.error(
      "CHANGE OWNER PASSWORD ERROR:",
      error
    );

    alert(
      "تغییر رمز انجام نشد:\n\n" +
      error.message
    );

  }

}


/* =====================================================
   مدیریت فروشگاه‌ها
===================================================== */

function renderAdminStores(stores) {

  const container =
    document.getElementById(
      "adminStores"
    );

  if (!container) {
    return;
  }

  if (!stores.length) {

    container.innerHTML = `

      <div class="empty">

        هیچ فروشگاهی وجود ندارد.

      </div>

    `;

    return;
  }

  container.innerHTML = "";

  stores.forEach(store => {

    const row =
      document.createElement("div");

    row.className =
      "itemRow";

    const blocked =
      !!store.isBlocked;

    row.innerHTML = `

      <h4>

        🏪
        ${escapeHTML(store.name)}

      </h4>

      <p>

        دسته:

        ${escapeHTML(
          getCategoryName(store.category)
        )}

      </p>

      <p>

        مالک فروشگاه:

        ${escapeHTML(store.ownerId)}

      </p>

      <p>

        وضعیت:

        ${
          blocked
            ? `
              <strong style="color:#b00020;">
                🔴 مسدود
              </strong>
            `
            : `
              <strong style="color:green;">
                🟢 فعال
              </strong>
            `
        }

      </p>

      ${
        blocked
          ? `
            <button
              class="mainBtn"
              type="button"
              onclick="
                adminSetStoreBlocked(
                  '${escapeHTML(store.id)}',
                  false
                )
              ">

              🟢 فعال کردن فروشگاه

            </button>
          `
          : `
            <button
              class="mainBtn"
              type="button"
              style="
                background:#d88900;
                color:#fff;
                margin-left:5px;
              "
              onclick="
                adminSetStoreBlocked(
                  '${escapeHTML(store.id)}',
                  true
                )
              ">

              ⛔ مسدود کردن

            </button>
          `
      }

      <button
        class="deleteBtn"
        onclick="
          adminDeleteStore('${escapeHTML(store.id)}')
        ">

        🗑️ حذف فروشگاه

      </button>

    `;

    container.appendChild(row);

  });

}


/* =====================================================
   مسدود / فعال کردن فروشگاه
===================================================== */

async function adminSetStoreBlocked(
  storeId,
  blocked
) {

  const access =
    await requireOwnerAccess();

  if (!access) {
    return;
  }

  const actionText =
    blocked
      ? "مسدود کردن"
      : "فعال کردن";

  if (
    !confirm(
      `آیا از ${actionText} این فروشگاه مطمئن هستید؟`
    )
  ) {

    return;
  }

  try {

    const token =
      getOwnerToken();

    await supabaseRpc(
      "admin_set_store_blocked",
      {
        p_store_id:
          Number(storeId),

        p_blocked:
          !!blocked,

        p_token:
          token
      }
    );

    alert(
      blocked
        ? "فروشگاه مسدود شد."
        : "فروشگاه دوباره فعال شد."
    );

    await renderAdminPanel();

  } catch (error) {

    console.error(
      "ADMIN STORE BLOCK ERROR:",
      error
    );

    alert(
      `${actionText} فروشگاه انجام نشد:\n\n` +
      error.message
    );

  }

}


/* =====================================================
   حذف فروشگاه توسط مالک
===================================================== */

async function adminDeleteStore(storeId) {

  const access =
    await requireOwnerAccess();

  if (!access) {
    return;
  }

  const store =
    await getStoreById(storeId);

  if (!store) {

    alert(
      "فروشگاه پیدا نشد."
    );

    return;
  }

  if (
    !confirm(
      "با حذف فروشگاه، محصولات و اطلاعات وابسته آن نیز حذف می‌شوند.\n\n" +
      "آیا ادامه می‌دهید؟"
    )
  ) {

    return;
  }

  try {

    const token =
      getOwnerToken();

    await supabaseRpc(
      "admin_delete_store",
      {
        p_store_id:
          Number(storeId),

        p_token:
          token
      }
    );

    localStorage.removeItem(
      getCartStorageKey(storeId)
    );

    localStorage.removeItem(
      "anarKalaStoreVisit_" +
      String(storeId)
    );

    alert(
      "فروشگاه با موفقیت حذف شد."
    );

    await renderAdminPanel();

  } catch (error) {

    console.error(
      "ADMIN DELETE STORE ERROR:",
      error
    );

    alert(
      "خطای حذف فروشگاه:\n\n" +
      error.message
    );

  }

}


/* =====================================================
   مدیریت محصولات
===================================================== */

function renderAdminProducts(products) {

  const container =
    document.getElementById(
      "adminProducts"
    );

  if (!container) {
    return;
  }

  if (!products.length) {

    container.innerHTML = `

      <div class="empty">

        هیچ محصولی وجود ندارد.

      </div>

    `;

    return;
  }

  container.innerHTML = "";

  products.forEach(product => {

    const row =
      document.createElement("div");

    row.className =
      "itemRow";

    row.innerHTML = `

      <h4>

        ${escapeHTML(product.name)}

      </h4>

      <p>

        قیمت:

        ${escapeHTML(product.price)}
        افغانی

      </p>

      <p>

        فروشگاه:

        ${escapeHTML(product.storeId)}

      </p>

      <button
        class="deleteBtn"
        onclick="
          adminDeleteProduct('${escapeHTML(product.id)}')
        ">

        حذف محصول

      </button>

    `;

    container.appendChild(row);

  });

}


async function adminDeleteProduct(productId) {

  const access =
    await requireOwnerAccess();

  if (!access) {
    return;
  }

  if (
    !confirm(
      "آیا از حذف این محصول مطمئن هستید؟"
    )
  ) {

    return;
  }

  try {

    await supabaseRequest(
      "products",
      {
        method: "DELETE",

        query:
          "?id=eq." +
          encodeURIComponent(productId)
      }
    );

    alert(
      "محصول حذف شد."
    );

    await renderAdminPanel();

  } catch (error) {

    console.error(
      "ADMIN DELETE PRODUCT ERROR:",
      error
    );

    alert(
      "خطای حذف محصول:\n\n" +
      error.message
    );

  }

}


/* =====================================================
   کاربران مدیریت
===================================================== */

function renderAdminUsers(users) {

  const container =
    document.getElementById(
      "adminUsers"
    );

  if (!container) {
    return;
  }

  if (!users || !users.length) {

    container.innerHTML = `

      <div class="empty">

        هنوز کاربری ثبت‌نام نکرده است.

      </div>

    `;

    return;
  }

  container.innerHTML = "";

  users.forEach(user => {

    const row =
      document.createElement("div");

    row.className =
      "itemRow";

    const isOwnerAccount =
      normalizePhone(user.phone) ===
      normalizePhone(OWNER.phone);

    const typeText =
      user.type === "seller"
        ? "فروشنده"
        : user.type === "admin"
          ? "مالک"
          : "خریدار";

    const blocked =
      isUserBlocked(user);

    const deleteButton =
      isOwnerAccount ||
      user.type === "admin"
        ? `

          <button
            class="deleteBtn"
            disabled>

            حساب مالک

          </button>

        `
        : `

          <button
            class="deleteBtn"
            onclick="
              adminDeleteUser('${escapeHTML(user.id)}')
            ">

            🗑️ حذف کاربر

          </button>

        `;

    const blockButton =
      isOwnerAccount ||
      user.type === "admin"
        ? ""
        : blocked
          ? `

            <button
              class="mainBtn"
              type="button"
              onclick="
                adminSetUserBlocked(
                  '${escapeHTML(user.id)}',
                  false
                )
              ">

              🟢 فعال کردن حساب

            </button>

          `
          : `

            <button
              class="mainBtn"
              type="button"
              style="
                background:#d88900;
                color:#fff;
              "
              onclick="
                adminSetUserBlocked(
                  '${escapeHTML(user.id)}',
                  true
                )
              ">

              ⛔ مسدود کردن حساب

            </button>

          `;

    row.innerHTML = `

      <h4>

        ${escapeHTML(user.name)}

      </h4>

      ${
        isOwnerAccount
          ? ""
          : `

            <p>

              شماره:

              ${escapeHTML(user.phone)}

            </p>

          `
      }

      <p>

        نوع حساب:

        ${typeText}

      </p>

      <p>

        وضعیت:

        ${
          blocked
            ? `
              <strong style="color:#b00020;">
                🔴 مسدود
              </strong>
            `
            : `
              <strong style="color:green;">
                🟢 فعال
              </strong>
            `
        }

      </p>

      ${
        user.created_at
          ? `

            <p>

              تاریخ ثبت:

              ${escapeHTML(
                new Date(
                  user.created_at
                ).toLocaleDateString(
                  "fa-AF"
                )
              )}

            </p>

          `
          : ""
      }

      ${
        isOwnerAccount
          ? `
            <p style="
              color:#777;
              font-size:13px;
            ">

              🔐 حساب مالک اصلی سایت

            </p>
          `
          : ""
      }

      <div
        style="
          display:flex;
          gap:8px;
          flex-wrap:wrap;
          margin-top:10px;
        ">

        ${blockButton}

        ${deleteButton}

      </div>

    `;

    container.appendChild(row);

  });

}


/* =====================================================
   مسدود / فعال کردن کاربر
===================================================== */

async function adminSetUserBlocked(
  userId,
  blocked
) {

  const access =
    await requireOwnerAccess();

  if (!access) {
    return;
  }

  const numericUserId =
    Number(userId);

  if (
    !Number.isInteger(numericUserId) ||
    numericUserId <= 0
  ) {

    alert(
      "شناسه کاربر نامعتبر است."
    );

    return;
  }

  try {

    const users =
      await getUsers();

    const targetUser =
      users.find(
        item =>
          Number(item.id) ===
          numericUserId
      );

    if (!targetUser) {

      alert(
        "کاربر پیدا نشد."
      );

      return;
    }

    if (
      normalizePhone(targetUser.phone) ===
      normalizePhone(OWNER.phone) ||
      targetUser.type === "admin"
    ) {

      alert(
        "حساب مالک قابل مسدود کردن نیست."
      );

      return;
    }

    const actionText =
      blocked
        ? "مسدود کردن"
        : "فعال کردن";

    if (
      !confirm(
        `آیا از ${actionText} این کاربر مطمئن هستید؟`
      )
    ) {

      return;
    }

    const token =
      getOwnerToken();

    await supabaseRpc(
      "admin_set_user_blocked",
      {
        p_user_id:
          numericUserId,

        p_blocked:
          !!blocked,

        p_token:
          token
      }
    );

    alert(
      blocked
        ? "کاربر مسدود شد."
        : "کاربر دوباره فعال شد."
    );

    await renderAdminPanel();

  } catch (error) {

    console.error(
      "ADMIN USER BLOCK ERROR:",
      error
    );

    alert(
      "تغییر وضعیت کاربر انجام نشد:\n\n" +
      error.message
    );

  }

}


/* =====================================================
   حذف کاربر
===================================================== */

async function adminDeleteUser(userId) {

  const access =
    await requireOwnerAccess();

  if (!access) {
    return;
  }

  const numericUserId =
    Number(userId);

  if (
    !Number.isInteger(numericUserId) ||
    numericUserId <= 0
  ) {

    alert(
      "شناسه کاربر نامعتبر است."
    );

    return;
  }

  try {

    const users =
      await getUsers();

    const targetUser =
      users.find(
        item =>
          Number(item.id) ===
          numericUserId
      );

    if (!targetUser) {

      alert(
        "کاربر پیدا نشد."
      );

      return;
    }

    if (
      normalizePhone(targetUser.phone) ===
      normalizePhone(OWNER.phone) ||
      targetUser.type === "admin"
    ) {

      alert(
        "حساب مالک قابل حذف نیست."
      );

      return;
    }

    const confirmed =
      confirm(
        "آیا از حذف این کاربر مطمئن هستید؟\n\n" +
        "فروشگاه و محصولات مرتبط با این کاربر نیز حذف خواهند شد."
      );

    if (!confirmed) {
      return;
    }

    const token =
      getOwnerToken();

    if (!token) {

      alert(
        "توکن مالک پیدا نشد."
      );

      return;
    }

    await supabaseRpc(
      "admin_delete_user",
      {
        p_user_id:
          numericUserId,

        p_token:
          token
      }
    );

    alert(
      "کاربر با موفقیت حذف شد."
    );

    await renderAdminPanel();

  } catch (error) {

    console.error(
      "ADMIN DELETE USER ERROR:",
      error
    );

    alert(
      "خطای حذف کاربر:\n\n" +
      error.message
    );

  }

}


/* =====================================================
   درخواست‌های فراموشی رمز برای مالک
===================================================== */

async function getPasswordResetRequests() {

  const access =
    await requireOwnerAccess();

  if (!access) {
    return [];
  }

  const token =
    getOwnerToken();

  const result =
    await supabaseRpc(
      "admin_get_password_reset_requests",
      {
        p_token:
          token
      }
    );

  return Array.isArray(result)
    ? result
    : [];
}


async function renderAdminPasswordRequests() {

  const container =
    document.getElementById(
      "adminPasswordRequests"
    );

  if (!container) {
    return;
  }

  try {

    const requests =
      await getPasswordResetRequests();

    if (!requests.length) {

      container.innerHTML = `

        <div class="empty">

          درخواست باز فعالی وجود ندارد.

        </div>

      `;

      return;
    }

    container.innerHTML = "";

    requests.forEach(request => {

      const row =
        document.createElement("div");

      row.className =
        "itemRow";

      const requestId =
        request.id;

      const userId =
        request.user_id ??
        request.userid ??
        request.userId ??
        "";

      const name =
        request.name ||
        request.user_name ||
        request.username ||
        "کاربر";

      const phone =
        request.phone ||
        request.user_phone ||
        "";

      const type =
        request.type ||
        request.user_type ||
        "buyer";

      const status =
        request.status ||
        "pending";

      const requestedAt =
        request.requested_at ||
        request.created_at ||
        request.createdAt ||
        "";

      const typeText =
        type === "seller"
          ? "فروشنده"
          : "خریدار";

      row.innerHTML = `

        <h4>

          🔑 درخواست تغییر رمز

        </h4>

        <p>

          نام:

          <strong>
            ${escapeHTML(name)}
          </strong>

        </p>

        <p>

          شماره:

          ${escapeHTML(phone)}

        </p>

        <p>

          نوع حساب:

          ${escapeHTML(typeText)}

        </p>

        ${
          requestedAt
            ? `
              <p>
                زمان درخواست:
                ${escapeHTML(
                  new Date(
                    requestedAt
                  ).toLocaleString(
                    "fa-AF"
                  )
                )}
              </p>
            `
            : ""
        }

        <p>

          وضعیت:

          <strong>
            ${escapeHTML(status)}
          </strong>

        </p>

        <div
          style="
            margin-top:10px;
          ">

          <input
            id="temporaryPassword_${escapeHTML(requestId)}"
            type="password"
            placeholder="رمز موقت جدید"
            style="
              width:100%;
              margin-bottom:8px;
            ">

          <button
            type="button"
            class="mainBtn"
            onclick="
              adminSetTemporaryPassword(
                '${escapeHTML(requestId)}',
                '${escapeHTML(userId)}'
              )
            ">

            🔐 تعیین رمز موقت

          </button>

        </div>

      `;

      container.appendChild(row);

    });

  } catch (error) {

    console.error(
      "PASSWORD REQUESTS ERROR:",
      error
    );

    container.innerHTML = `

      <div class="empty">

        دریافت درخواست‌ها انجام نشد.

        <br>

        ${escapeHTML(error.message)}

      </div>

    `;

  }

}


/* =====================================================
   تعیین رمز موقت کاربر توسط مالک
===================================================== */

async function adminSetTemporaryPassword(
  requestId,
  userId
) {

  const access =
    await requireOwnerAccess();

  if (!access) {
    return;
  }

  const input =
    document.getElementById(
      "temporaryPassword_" +
      requestId
    );

  if (!input) {

    alert(
      "فیلد رمز موقت پیدا نشد."
    );

    return;
  }

  const temporaryPassword =
    input.value;

  if (
    !temporaryPassword ||
    temporaryPassword.length < 6
  ) {

    alert(
      "رمز موقت باید حداقل ۶ کاراکتر باشد."
    );

    return;
  }

  if (
    !confirm(
      "آیا رمز موقت تعیین شود؟"
    )
  ) {

    return;
  }

  try {

    const token =
      getOwnerToken();

    await supabaseRpc(
      "admin_set_temporary_password",
      {
        p_token:
          token,

        p_request_id:
          Number(requestId),

        p_temporary_password:
          temporaryPassword
      }
    );

    alert(
      "رمز موقت با موفقیت تعیین شد.\n\n" +
      "رمز را به کاربر اطلاع دهید."
    );

    await renderAdminPasswordRequests();

  } catch (error) {

    console.error(
      "SET TEMP PASSWORD ERROR:",
      error
    );

    alert(
      "تعیین رمز موقت انجام نشد:\n\n" +
      error.message
    );

  }

}


/* =====================================================
   آمار بازدید فروشگاه‌ها در پنل مالک
===================================================== */

function findStoreStats(
  stats,
  storeId
) {

  if (!Array.isArray(stats)) {
    return null;
  }

  return (
    stats.find(item =>
      String(
        item.store_id ??
        item.storeId ??
        item.id ??
        ""
      ) ===
      String(storeId)
    ) ||
    null
  );
}


function renderAdminStoreVisitorStats(
  stores,
  stats
) {

  const container =
    document.getElementById(
      "adminStoreVisitorStats"
    );

  if (!container) {
    return;
  }

  if (!stores.length) {

    container.innerHTML = `

      <div class="empty">

        هنوز فروشگاهی وجود ندارد.

      </div>

    `;

    return;
  }

  container.innerHTML = "";

  stores.forEach(store => {

    const stat =
      findStoreStats(
        stats,
        store.id
      );

    const total =
      getStatValue(
        stat,
        [
          "total",
          "total_visits",
          "total_visitors"
        ]
      );

    const today =
      getStatValue(
        stat,
        [
          "today",
          "today_visits",
          "today_visitors"
        ]
      );

    const month =
      getStatValue(
        stat,
        [
          "month",
          "month_visits",
          "month_visitors",
          "this_month"
        ]
      );

    const row =
      document.createElement("div");

    row.className =
      "itemRow";

    row.innerHTML = `

      <h4>

        🏪
        ${escapeHTML(store.name)}

        ${
          store.isBlocked
            ? `
              <span
                style="
                  color:#b00020;
                  font-size:13px;
                ">

                (مسدود)

              </span>
            `
            : ""
        }

      </h4>

      <div
        style="
          display:grid;
          grid-template-columns:
            repeat(auto-fit,minmax(120px,1fr));
          gap:8px;
          margin-top:10px;
        ">

        <div
          style="
            background:#f5f5f5;
            border-radius:10px;
            padding:10px;
            text-align:center;
          ">

          👁️ کل

          <strong
            style="
              display:block;
              font-size:20px;
              margin-top:4px;
            ">

            ${toFaDigits(total)}

          </strong>

        </div>

        <div
          style="
            background:#f5f5f5;
            border-radius:10px;
            padding:10px;
            text-align:center;
          ">

          📅 امروز

          <strong
            style="
              display:block;
              font-size:20px;
              margin-top:4px;
            ">

            ${toFaDigits(today)}

          </strong>

        </div>

        <div
          style="
            background:#f5f5f5;
            border-radius:10px;
            padding:10px;
            text-align:center;
          ">

          📆 این ماه

          <strong
            style="
              display:block;
              font-size:20px;
              margin-top:4px;
            ">

            ${toFaDigits(month)}

          </strong>

        </div>

      </div>

    `;

    container.appendChild(row);

  });

}


/* =====================================================
   دسته‌ها برای Select
===================================================== */

function getCategoryOptions(selected) {

  let html = "";

  Object.keys(CATEGORIES)
    .forEach(key => {

      const isSelected =
        normalizeCategoryKey(selected) === key
          ? "selected"
          : "";

      html += `

        <option
          value="${key}"
          ${isSelected}>

          ${CATEGORIES[key][0]}

          ${escapeHTML(
            CATEGORIES[key][1]
          )}

        </option>

      `;

    });

  return html;
}


function getCategoryName(category) {

  const normalized =
    normalizeCategoryKey(category);

  if (CATEGORIES[normalized]) {

    return CATEGORIES[normalized][1];

  }

  return "عمومی";

}


/* =====================================================
   بروزرسانی سبد در شروع
===================================================== */

document.addEventListener(
  "DOMContentLoaded",
  function() {

    updateGlobalCartButton();

    /*
       اگر فرم ورود در HTML وجود داشته باشد،
       دکمه فراموشی رمز را اضافه می‌کنیم.
    */

    ensureForgotPasswordBox();

  }
);


/* =====================================================
   پایان app.js
===================================================== */
