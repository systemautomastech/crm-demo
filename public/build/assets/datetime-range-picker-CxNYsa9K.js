import{b as h,j as r}from"./ui-Bjt2ZI42.js";import{D as b}from"./react-datepicker-BB9BmS_N.js";import{c as w}from"./utils-DqweA7RH.js";import{B as H}from"./button-l42MBdAf.js";import{P as z,a as I,b as L}from"./popover-IM7TCWxo.js";import{u as U}from"./useTranslation-49h-Riry.js";import{C as B}from"./calendar-BgkNwEUZ.js";function J({value:a,onChange:d,placeholder:S,className:y,triggerClassName:D,id:O,required:R,disabled:m=!1,timeFormat:f="HH:mm",dateFormat:v="MMM d, yyyy h:mm aa",mode:i="range"}){const{t:p}=U(),[k,x]=h.useState(!1),[o,g]=h.useState(null),[c,u]=h.useState(null);h.useEffect(()=>{if(a&&(a.includes("T")||a.includes("Z"))){const e=j(a);if(e!==a){d(e);return}}if(a)if(i==="single")g(new Date(a.replace(" ","T"))),u(null);else{const[e,n]=a.split(" - ");g(e?new Date(e.replace(" ","T")):null),u(n?new Date(n.replace(" ","T")):null)}else g(null),u(null)},[a,i]);const j=e=>{const n=t=>{if(!t)return"";if(t.includes("Z")){const s=new Date(t),N=s.getFullYear(),C=String(s.getMonth()+1).padStart(2,"0"),P=String(s.getDate()).padStart(2,"0"),M=String(s.getHours()).padStart(2,"0"),E=String(s.getMinutes()).padStart(2,"0");return`${N}-${C}-${P} ${M}:${E}`}return t};if(i==="single")return n(e);{const[t,s]=e.split(" - ");return`${n(t)} - ${n(s)}`}},$=(e,n)=>{const t={year:"numeric",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"};return i==="single"?e?e.toLocaleDateString("en-US",t):"":!e||!n?"":`${e.toLocaleDateString("en-US",t)} - ${n.toLocaleDateString("en-US",t)}`},l=e=>{const n=`${e.getFullYear()}-${String(e.getMonth()+1).padStart(2,"0")}-${String(e.getDate()).padStart(2,"0")}`,t=`${String(e.getHours()).padStart(2,"0")}:${String(e.getMinutes()).padStart(2,"0")}`;return`${n} ${t}`},_=e=>{e&&(g(e),i==="single"?(d(l(e)),x(!1)):d(c?`${l(e)} - ${l(c)}`:`${l(e)} - `))},T=e=>{e&&o&&(u(e),d(`${l(o)} - ${l(e)}`),x(!1))};return r.jsxs("div",{className:w("w-full",y),onWheel:e=>{k||e.stopPropagation()},children:[r.jsxs(z,{open:m?!1:k,onOpenChange:m?void 0:x,modal:!1,children:[r.jsx(I,{asChild:!0,children:r.jsxs(H,{type:"button",variant:"outline",disabled:m,className:w("w-full justify-start text-left font-normal h-10",!a&&"text-muted-foreground",m&&"opacity-60 cursor-not-allowed bg-muted pointer-events-none",D),children:[r.jsx(B,{className:"mr-2 h-4 w-4"}),a&&o&&(i==="single"||c)?$(o,c):S||p(i==="single"?"Select date time":"Select date time range")]})}),r.jsx(L,{className:"w-auto p-0",align:"start",onWheel:e=>{e.stopPropagation()},children:r.jsx("div",{className:"datetime-range-wrapper",children:i==="single"?r.jsxs("div",{className:"p-3",children:[r.jsx("div",{className:"text-sm font-medium mb-2 text-center",children:p("Select Date & Time")}),r.jsx(b,{selected:o,onChange:_,showTimeSelect:!0,timeFormat:f,timeIntervals:15,timeCaption:"Time",dateFormat:v,inline:!0})]}):r.jsxs("div",{className:"flex",children:[r.jsxs("div",{className:"p-3 border-r border-border",children:[r.jsx("div",{className:"text-sm font-medium mb-2 text-center",children:p("Start Date & Time")}),r.jsx(b,{selected:o,onChange:_,showTimeSelect:!0,timeFormat:f,timeIntervals:15,timeCaption:"Time",dateFormat:v,inline:!0,maxDate:c||void 0})]}),r.jsxs("div",{className:"p-3",children:[r.jsx("div",{className:"text-sm font-medium mb-2 text-center",children:p("End Date & Time")}),r.jsx(b,{selected:c,onChange:T,showTimeSelect:!0,timeFormat:f,timeIntervals:15,timeCaption:"Time",dateFormat:v,inline:!0,minDate:o||void 0})]})]})})})]}),r.jsx("style",{children:`
        .datetime-range-wrapper .react-datepicker {
          font-family: inherit;
          border: none;
          background: hsl(var(--background));
          color: hsl(var(--foreground));
        }
        .datetime-range-wrapper .react-datepicker__header {
          background: hsl(var(--background));
          border-bottom: 1px solid hsl(var(--border));
          border-radius: 0;
        }
        .datetime-range-wrapper .react-datepicker__current-month,
        .datetime-range-wrapper .react-datepicker__day-name {
          color: hsl(var(--foreground));
          font-weight: 500;
        }
        .datetime-range-wrapper .react-datepicker__day {
          color: hsl(var(--foreground));
          border-radius: 6px;
        }
        .datetime-range-wrapper .react-datepicker__day:hover {
          background: hsl(var(--accent));
          color: hsl(var(--accent-foreground));
        }
        .datetime-range-wrapper .react-datepicker__day--selected {
          background: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
        }
        .datetime-range-wrapper .react-datepicker__navigation {
          border: none;
          border-radius: 6px;
        }
        .datetime-range-wrapper .react-datepicker__navigation:hover {
          background: hsl(var(--accent));
        }
        .datetime-range-wrapper .react-datepicker__navigation-icon::before {
          border-color: hsl(var(--foreground));
        }
        .datetime-range-wrapper .react-datepicker__day--outside-month {
          color: hsl(var(--muted-foreground));
        }
        .datetime-range-wrapper .react-datepicker__day--disabled {
          color: hsl(var(--muted-foreground));
          opacity: 0.5;
        }
        .datetime-range-wrapper .react-datepicker__time-container {
          background: hsl(var(--background));
          border-left: 1px solid hsl(var(--border));
        }
        .datetime-range-wrapper .react-datepicker__time {
          background: hsl(var(--background));
        }
        .datetime-range-wrapper .react-datepicker__time-box {
          background: hsl(var(--background));
        }
        .datetime-range-wrapper .react-datepicker__time-list-item {
          color: hsl(var(--foreground));
        }
        .datetime-range-wrapper .react-datepicker__time-list-item:hover {
          background: hsl(var(--accent));
        }
        .datetime-range-wrapper .react-datepicker__time-list-item--selected {
          background: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
        }
        .datetime-range-wrapper .react-datepicker__time-name {
          color: hsl(var(--foreground));
        }
      `})]})}export{J as D};
