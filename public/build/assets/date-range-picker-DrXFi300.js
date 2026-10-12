import{b as m,j as s}from"./ui-Bjt2ZI42.js";import{D as x}from"./react-datepicker-BB9BmS_N.js";import{c as f}from"./utils-DqweA7RH.js";import{B as D}from"./button-l42MBdAf.js";import{P as j,a as P,b as N}from"./popover-IM7TCWxo.js";import{u as T}from"./useTranslation-49h-Riry.js";import{C}from"./calendar-BgkNwEUZ.js";function O({value:n,onChange:d,placeholder:_,className:k,id:F,required:M}){const{t:w}=T(),[b,h]=m.useState(!1);m.useEffect(()=>{if(n&&(n.includes("T")||n.includes("Z"))){const e=y(n);e!==n&&d(e)}},[n]);const y=e=>{const[r,a]=e.split(" - "),o=t=>{if(!t)return"";if(t.includes("T")&&t.includes("Z")){const c=new Date(t),l=c.getFullYear(),g=String(c.getMonth()+1).padStart(2,"0"),u=String(c.getDate()).padStart(2,"0");return`${l}-${g}-${u}`}return t.split("T")[0]};return`${o(r)} - ${o(a)}`},S=e=>{if(!e)return[null,null];const[r,a]=e.split(" - "),o=t=>{if(!t)return null;const c=t.split("T")[0],[l,g,u]=c.split("-").map(Number);return new Date(l,g-1,u,12,0,0)};return[o(r),o(a)]},v=(e,r)=>{if(!e||!r)return"";const a={year:"numeric",month:"short",day:"numeric"};return`${e.toLocaleDateString("en-US",a)} - ${r.toLocaleDateString("en-US",a)}`},[i,p]=S(n),$=e=>{const[r,a]=e;if(r&&a){const o=`${r.getFullYear()}-${String(r.getMonth()+1).padStart(2,"0")}-${String(r.getDate()).padStart(2,"0")}`,t=`${a.getFullYear()}-${String(a.getMonth()+1).padStart(2,"0")}-${String(a.getDate()).padStart(2,"0")}`;d(`${o} - ${t}`),h(!1)}else if(r&&!a){const o=`${r.getFullYear()}-${String(r.getMonth()+1).padStart(2,"0")}-${String(r.getDate()).padStart(2,"0")}`;d(`${o} - `)}else d("")};return s.jsxs("div",{className:f("w-full",k),children:[s.jsxs(j,{open:b,onOpenChange:h,children:[s.jsx(P,{asChild:!0,children:s.jsxs(D,{variant:"outline",className:f("w-full justify-start text-left font-normal h-10",!n&&"text-muted-foreground"),children:[s.jsx(C,{className:"mr-2 h-4 w-4"}),n&&i&&p?v(i,p):_||w("Select date range")]})}),s.jsx(N,{className:"w-auto p-0",align:"start",children:s.jsx("div",{className:"date-range-wrapper",children:s.jsx(x,{selected:i,onChange:$,startDate:i,endDate:p,selectsRange:!0,monthsShown:2,inline:!0,showPopperArrow:!1})})})]}),s.jsx("style",{children:`
        .date-range-wrapper .react-datepicker {
          font-family: inherit;
          border: none;
          background: hsl(var(--background));
          color: hsl(var(--foreground));
        }
        .date-range-wrapper .react-datepicker__header {
          background: hsl(var(--background));
          border-bottom: 1px solid hsl(var(--border));
          border-radius: 0;
        }
        .date-range-wrapper .react-datepicker__current-month,
        .date-range-wrapper .react-datepicker__day-name {
          color: hsl(var(--foreground));
          font-weight: 500;
        }
        .date-range-wrapper .react-datepicker__day {
          color: hsl(var(--foreground));
          border-radius: 6px;
        }
        .date-range-wrapper .react-datepicker__day:hover {
          background: hsl(var(--accent));
          color: hsl(var(--accent-foreground));
        }
        .date-range-wrapper .react-datepicker__day--selected,
        .date-range-wrapper .react-datepicker__day--in-selecting-range,
        .date-range-wrapper .react-datepicker__day--in-range {
          background: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
        }
        .date-range-wrapper .react-datepicker__day--range-start,
        .date-range-wrapper .react-datepicker__day--range-end {
          background: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
        }
        .date-range-wrapper .react-datepicker__navigation {
          border: none;
          border-radius: 6px;
        }
        .date-range-wrapper .react-datepicker__navigation:hover {
          background: hsl(var(--accent));
        }
        .date-range-wrapper .react-datepicker__navigation-icon::before {
          border-color: hsl(var(--foreground));
        }
        .date-range-wrapper .react-datepicker__day--outside-month {
          color: hsl(var(--muted-foreground));
        }
        .date-range-wrapper .react-datepicker__day--disabled {
          color: hsl(var(--muted-foreground));
          opacity: 0.5;
        }
        .date-range-wrapper .react-datepicker__month-container {
          background: hsl(var(--background));
        }
      `})]})}export{O as D};
