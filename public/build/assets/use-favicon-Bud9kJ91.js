import{R as V,b as L,j as q}from"./ui-Bjt2ZI42.js";import{X as P}from"./app-DUKN7GPt.js";import{b as B}from"./helpers-DZhu92bP.js";const I=L.createContext(void 0);function N({children:d}){var z,w;const{adminAllSetting:k,companyAllSetting:C,auth:r}=P().props,M=(w=(z=r==null?void 0:r.user)==null?void 0:z.roles)==null?void 0:w.includes("superadmin");let e;M!=null?e=M?k:C:e=k;const v=V.useMemo(()=>{if(r!=null&&r.layout_direction)return r.layout_direction;const o=document.documentElement.lang||"en";return["ar","he","ur","fa","ps","yi"].includes(o)?"rtl":"ltr"},[r==null?void 0:r.layout_direction]),t={logo_dark:(e==null?void 0:e.logo_dark)||"",logo_light:(e==null?void 0:e.logo_light)||"",favicon:(e==null?void 0:e.favicon)||"",titleText:(e==null?void 0:e.titleText)||"AutomasCRM",footerText:(e==null?void 0:e.footerText)||"© AutomasCRM. All rights reserved.",sidebarVariant:(e==null?void 0:e.sidebarVariant)||"inset",sidebarStyle:(e==null?void 0:e.sidebarStyle)||"plain",sidebarTextColor:(e==null?void 0:e.sidebarTextColor)||"#ffffff",themeMode:(e==null?void 0:e.themeMode)||"light",themeColor:(e==null?void 0:e.themeColor)||"green",customColor:(e==null?void 0:e.customColor)||"#10b981",layoutDirection:v},s=o=>B(o),i={blue:"#3b82f6",green:"#10b981",purple:"#8b5cf6",orange:"#f97316",red:"#ef4444"},c=()=>t.themeColor==="custom"?t.customColor||"#10b981":i[t.themeColor]||"#10b981";L.useEffect(()=>{const o=c(),n=document.documentElement,E=a=>{const p=parseInt(a.slice(1,3),16)/255,m=parseInt(a.slice(3,5),16)/255,b=parseInt(a.slice(5,7),16)/255,f=Math.max(p,m,b),y=Math.min(p,m,b);let g=0,_=0,A=(f+y)/2;if(f!==y){const x=f-y;switch(_=A>.5?x/(2-f-y):x/(f+y),f){case p:g=(m-b)/x+(m<b?6:0);break;case m:g=(b-p)/x+2;break;case b:g=(p-m)/x+4;break}g/=6}return`${Math.round(g*360)} ${Math.round(_*100)}% ${Math.round(A*100)}%`};n.style.setProperty("--primary",E(o)),n.style.setProperty("--primary-foreground","0 0% 98%");const h=v==="rtl";n.dir=h?"rtl":"ltr",n.style.direction=h?"rtl":"ltr",document.body.dir=h?"rtl":"ltr",document.body.style.direction=h?"rtl":"ltr",h?(document.body.classList.add("rtl"),document.body.classList.remove("ltr")):(document.body.classList.add("ltr"),document.body.classList.remove("rtl"));const T=t.themeMode,D=window.matchMedia("(prefers-color-scheme: dark)").matches;T==="light"?(document.body.classList.remove("dark"),document.body.classList.add("light")):T==="dark"?(document.body.classList.remove("light"),document.body.classList.add("dark")):T==="system"&&(D?(document.body.classList.remove("light"),document.body.classList.add("dark")):(document.body.classList.remove("dark"),document.body.classList.add("light")));let u=document.getElementById("brand-sidebar-styles");if(u||(u=document.createElement("style"),u.id="brand-sidebar-styles",document.head.appendChild(u)),t.sidebarStyle==="colored"||t.sidebarStyle==="gradient"){const a=t.sidebarTextColor||"#ffffff";u.textContent=`
    [data-sidebar] {
      --sidebar-foreground: ${a};
      --sidebar-accent-foreground: ${a};
      --sidebar-primary-foreground: ${a};

      color: ${a};
    }

    [data-sidebar] [data-sidebar="header"],
    [data-sidebar] [data-sidebar="content"],
    [data-sidebar] [data-sidebar="footer"],
    [data-sidebar] [data-sidebar="group-label"],
    [data-sidebar] [data-sidebar="menu-button"],
    [data-sidebar] [data-sidebar="menu-sub-button"] {
      color: ${a};
    }

    [data-sidebar] [data-sidebar="menu-button"] svg,
    [data-sidebar] [data-sidebar="menu-sub-button"] svg {
      color: ${a};
      stroke: currentColor;
    }

    [data-sidebar] .bg-sidebar-primary {
      background: rgba(255, 255, 255, 0.2);
      color: ${a};
    }

    [data-sidebar] [data-sidebar="menu-button"]:hover,
    [data-sidebar] [data-sidebar="menu-sub-button"]:hover {
      background: rgba(255, 255, 255, 0.12);
      color: ${a};
    }

    [data-sidebar] [data-sidebar="menu-button"][data-active="true"],
    [data-sidebar] [data-sidebar="menu-sub-button"][data-active="true"] {
      background: rgba(255, 255, 255, 0.2);
      color: ${a};
    }

    [data-sidebar] [data-sidebar="menu-button"] *,
    [data-sidebar] [data-sidebar="menu-sub-button"] * {
      color: inherit;
    }
  `}else u.textContent=""},[t.themeColor,t.customColor,t.sidebarStyle,t.sidebarTextColor,v,t.themeMode]);const l=()=>{const o=c();return t.sidebarStyle==="colored"?{backgroundColor:o}:t.sidebarStyle==="gradient"?{background:`linear-gradient(135deg, ${o} 0%, ${o}80 100%)`}:{}},$=()=>{let o="";return t.sidebarVariant==="floating"&&(o+=" m-2 rounded-lg shadow-sm"),o},R=()=>{const o=l(),n=$(),E=o.backgroundColor||o.background;return{style:{...o,...E&&{backgroundColor:o.backgroundColor||"transparent",background:o.background||o.backgroundColor||"transparent"}},className:`${n}`}},j=()=>{const o=window.matchMedia("(prefers-color-scheme: dark)").matches;return t.themeMode==="dark"||t.themeMode==="system"&&o?t.logo_light||t.logo_dark||"":t.logo_dark||t.logo_light||""};return q.jsx(I.Provider,{value:{settings:t,getPreviewUrl:s,getPrimaryColor:c,getSidebarStyles:l,getSidebarClasses:$,getCompleteSidebarProps:R,getLogoSrc:j},children:d})}function O(){const d=L.useContext(I);if(d===void 0)throw new Error("useBrand must be used within a BrandProvider");return d}function X(){const{settings:d}=O(),{props:k}=P();L.useEffect(()=>{const C=d.favicon;if(!C)return;const r=B(C,k);document.querySelectorAll('link[rel*="icon"]').forEach(s=>s.remove()),[{rel:"icon",type:"image/x-icon",href:r},{rel:"shortcut icon",type:"image/x-icon",href:r},{rel:"apple-touch-icon",sizes:"57x57",href:r},{rel:"apple-touch-icon",sizes:"60x60",href:r},{rel:"apple-touch-icon",sizes:"72x72",href:r},{rel:"apple-touch-icon",sizes:"76x76",href:r},{rel:"apple-touch-icon",sizes:"114x114",href:r},{rel:"apple-touch-icon",sizes:"120x120",href:r},{rel:"apple-touch-icon",sizes:"144x144",href:r},{rel:"apple-touch-icon",sizes:"152x152",href:r},{rel:"apple-touch-icon",sizes:"180x180",href:r},{rel:"icon",type:"image/png",sizes:"192x192",href:r},{rel:"icon",type:"image/png",sizes:"32x32",href:r},{rel:"icon",type:"image/png",sizes:"96x96",href:r},{rel:"icon",type:"image/png",sizes:"16x16",href:r},{rel:"mask-icon",href:r,color:"#000000"}].forEach(s=>{const i=document.createElement("link");Object.entries(s).forEach(([c,l])=>{i.setAttribute(c,l)}),document.head.appendChild(i)}),document.querySelectorAll('meta[name*="msapplication"]').forEach(s=>s.remove()),[{name:"msapplication-TileColor",content:"#ffffff"},{name:"msapplication-TileImage",content:r},{name:"msapplication-config",content:"/browserconfig.xml"}].forEach(s=>{const i=document.createElement("meta");Object.entries(s).forEach(([c,l])=>{i.setAttribute(c,l)}),document.head.appendChild(i)})},[d.favicon])}export{N as B,X as a,O as u};
