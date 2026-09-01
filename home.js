const homeLabels={en:['ABOUT','WORKS','DIARY','GUESTBOOK','MY CAT'],zh:['关于我','我的作品','我的日记','给我留言','我的小猫'],ko:['소개','작품','일기','방명록','우리 고양이']};
const setHomeLang=lang=>{
  localStorage.setItem('suyoon-language',lang);
  document.documentElement.lang=lang;
  document.querySelectorAll('[data-home-label]').forEach((el,i)=>{el.textContent=homeLabels[lang][i]});
  document.querySelectorAll('[data-lang]').forEach(b=>b.classList.toggle('active',b.dataset.lang===lang));
};
document.querySelectorAll('[data-lang]').forEach(b=>b.onclick=()=>setHomeLang(b.dataset.lang));
setHomeLang(localStorage.getItem('suyoon-language')||'en');
