import{b as u,j as t}from"./ui-Bjt2ZI42.js";import{D as z}from"./react-datepicker-BB9BmS_N.js";import{c as h}from"./utils-DqweA7RH.js";import{B as M}from"./button-l42MBdAf.js";import{P as B,a as F,b as Y}from"./popover-IM7TCWxo.js";import{u as Z}from"./useTranslation-49h-Riry.js";import{C as O}from"./calendar-BgkNwEUZ.js";function G({value:r,onChange:p,placeholder:k,className:g,id:s,required:m,maxDate:w,minDate:f,showYearDropdown:_=!0,showMonthDropdown:b=!0,style:x,disabled:y=!1,filterDate:v}){const{t:D}=Z(),[j,l]=u.useState(!1);u.useEffect(()=>{if(r&&(r.includes("T")||r.includes("Z"))){const e=S(r);e!==r&&p(e)}},[r]);const S=e=>{if(!e)return"";if(e.includes("T")&&e.includes("Z")){const a=new Date(e),o=a.getFullYear(),n=String(a.getMonth()+1).padStart(2,"0"),c=String(a.getDate()).padStart(2,"0");return`${o}-${n}-${c}`}return e.split("T")[0]},C=e=>{if(!e)return null;if(e.includes("T")&&e.includes("Z")){const i=new Date(e),P=i.getFullYear(),T=i.getMonth(),$=i.getDate();return new Date(P,T,$,12,0,0)}const a=e.split("T")[0],[o,n,c]=a.split("-").map(Number);return new Date(o,n-1,c,12,0,0)},E=e=>{if(!e)return"";const a={year:"numeric",month:"short",day:"numeric"};return e.toLocaleDateString("en-US",a)},d=C(r),N=e=>{if(e){const a=e.getFullYear(),o=String(e.getMonth()+1).padStart(2,"0"),n=String(e.getDate()).padStart(2,"0"),c=`${a}-${o}-${n}`;p(c),l(!1)}else p("")};return t.jsxs("div",{className:h("w-full",g),children:[s&&t.jsx("input",{id:s,type:"hidden",value:r||"",required:m}),t.jsxs(B,{open:j,onOpenChange:l,children:[t.jsx(F,{asChild:!0,children:t.jsxs(M,{variant:"outline",className:h("w-full justify-start text-left font-normal h-10",!r&&"text-muted-foreground"),style:x,disabled:y,children:[t.jsx(O,{className:"mr-2 h-4 w-4"}),r&&d?E(d):k||D("Select date")]})}),t.jsx(Y,{className:"w-auto p-0",align:"start",children:t.jsx("div",{className:"date-picker-wrapper",children:t.jsx(z,{selected:d,onChange:N,inline:!0,showPopperArrow:!1,maxDate:w,minDate:f,showYearDropdown:_,showMonthDropdown:b,dropdownMode:"select",yearDropdownItemNumber:100,filterDate:v})})})]}),t.jsx("style",{children:`
        .date-picker-wrapper .react-datepicker {
          font-family: inherit;
          border: none;
          background: hsl(var(--background));
          color: hsl(var(--foreground));
        }
        .date-picker-wrapper .react-datepicker__header {
          background: hsl(var(--background));
          border-bottom: 1px solid hsl(var(--border));
          border-radius: 0;
        }
        .date-picker-wrapper .react-datepicker__current-month,
        .date-picker-wrapper .react-datepicker__day-name {
          color: hsl(var(--foreground));
          font-weight: 500;
        }
        .date-picker-wrapper .react-datepicker__day {
          color: hsl(var(--foreground));
          border-radius: 6px;
        }
        .date-picker-wrapper .react-datepicker__day:hover {
          background: hsl(var(--accent));
          color: hsl(var(--accent-foreground));
        }
        .date-picker-wrapper .react-datepicker__day--selected {
          background: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
        }
        .date-picker-wrapper .react-datepicker__navigation {
          border: none;
          border-radius: 6px;
        }
        .date-picker-wrapper .react-datepicker__navigation:hover {
          background: hsl(var(--accent));
        }
        .date-picker-wrapper .react-datepicker__navigation-icon::before {
          border-color: hsl(var(--foreground));
        }
        .date-picker-wrapper .react-datepicker__day--outside-month {
          color: hsl(var(--muted-foreground));
        }
        .date-picker-wrapper .react-datepicker__day--disabled {
          color: hsl(var(--muted-foreground));
          opacity: 0.5;
        }
        .date-picker-wrapper .react-datepicker__month-container {
          background: hsl(var(--background));
        }
        .date-picker-wrapper .react-datepicker__header__dropdown {
          display: flex;
          gap: 8px;
          justify-content: center;
          padding: 8px 0;
        }
        .date-picker-wrapper .react-datepicker__month-dropdown-container,
        .date-picker-wrapper .react-datepicker__year-dropdown-container {
          margin: 0;
        }
        .date-picker-wrapper .react-datepicker__year-select,
        .date-picker-wrapper .react-datepicker__month-select {
          background: hsl(var(--background));
          color: hsl(var(--foreground));
          border: 1px solid hsl(var(--border));
          border-radius: 6px;
          padding: 6px 32px 6px 12px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          outline: none;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 8px center;
          background-size: 12px;
          min-width: 80px;
        }
        .date-picker-wrapper .react-datepicker__month-select {
          min-width: 100px;
        }
        .date-picker-wrapper .react-datepicker__year-select:hover,
        .date-picker-wrapper .react-datepicker__month-select:hover {
          background-color: hsl(var(--accent));
          border-color: hsl(var(--border));
        }
        .date-picker-wrapper .react-datepicker__year-select:focus,
        .date-picker-wrapper .react-datepicker__month-select:focus {
          border-color: hsl(var(--ring));
          box-shadow: 0 0 0 2px hsl(var(--ring) / 0.2);
        }
      `})]})}export{G as D};
