const url = "https://jusfjpyxfdosoohtqhrb.supabase.co/rest/v1/notifications?select=title,message,created_at&order=created_at.desc&limit=5";
const key = "sb_publishable_wnLkQO6pHYflPuFoypVEgQ_1mRGsdLV";

fetch(url, {
  headers: {
    'apikey': key,
    'Authorization': `Bearer ${key}`
  }
}).then(res => res.json()).then(console.log).catch(console.error);
