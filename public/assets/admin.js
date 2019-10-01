!function(){var t={};const e={currentUser:null,isAdmin:!1,loadedGoogle:!1,loadingGoogle:!1,loadingListeners:[],authListeners:[],updateToken:function(t){if(!t)return e.clearToken();localStorage.setItem("logintoken",t),e.currentUser=JSON.parse(atob(t.split(".")[1])),e.authListeners.length&&e.authListeners.forEach(function(t){t(e.currentUser)})},clearToken:function(){e.currentUser=null,localStorage.removeItem("logintoken"),e.isAdmin=!1},addEvent:function(t){e.authListeners.push(t)},setAdmin:function(t){e.isAdmin=t},createGoogleScript:function(){return e.loadedGoogle?Promise.resolve():new Promise(function(t){if(e.loadedGoogle)return t();if(e.loadingListeners.push(t),e.loadingGoogle)return;e.loadingGoogle=!0;let a=document.createElement("script");a.type="text/javascript",a.async=!0,a.defer=!0,a.src="https://apis.google.com/js/platform.js?onload=googleLoaded",document.body.appendChild(a)})},getToken:function(){return localStorage.getItem("logintoken")}};window.googleLoaded||(window.googleLoaded=function(){for(e.loadedGoogle=!0;e.loadingListeners.length;)e.loadingListeners.pop()()}),e.updateToken(localStorage.getItem("logintoken")),t=e;var a={sendRequest:function(e,a){let i=t.getToken(),n=a;return i&&(e.headers=e.headers||{},e.headers.Authorization="Bearer "+i),e.extract=function(t){let e=null;if(n&&t.status<300){let a={};t.getAllResponseHeaders().split("\r\n").forEach(function(t){var e=t.split(": ");a[e[0]]=e[1]}),e={headers:a||{},data:JSON.parse(t.responseText)}}else e=t.responseText?JSON.parse(t.responseText):{};if(t.status>=300)throw e;return e},m.request(e).catch(function(e){return 403===e.code&&(t.clearToken(),m.route.set("/login",{redirect:m.route.get()})),e.response&&e.response.status?Promise.reject(e.response):Promise.reject(e)})}},i={};const{sendRequest:n}=a;i.uploadMedia=function(t){let e=new FormData;return e.append("file",t),n({method:"POST",url:"/api/media",body:e})};const{uploadMedia:r}=i;var s={uploadFile(t,e){e.target.files[0]&&(t.state.updateError(t,""),t.state.loading=!0,r(e.target.files[0]).then(function(e){t.attrs.onupload&&t.attrs.onupload(e)}).catch(function(e){t.state.updateError(t,e.message)}).then(function(){e.target.value=null,t.state.loading=!1,m.redraw()}))},updateError:function(t,e){t.attrs.onerror?t.attrs.onerror(e):t.state.error=e},oninit:function(t){t.state.loading=!1,t.state.error=""},view:function(t){let e=t.attrs.media;return m("fileupload",{class:t.attrs.class||null},[m("div.error",{hidden:!t.state.error},t.state.error),e?t.attrs.useimg?[m("img",{src:e.large_url}),m("div.showicon")]:m("a.display.inside",{href:e.large_url,style:{"background-image":'url("'+e.large_url+'")'}},m("div.showicon")):m("div.inside.showbordericon"),m("input",{accept:"image/*",type:"file",onchange:this.uploadFile.bind(this,t)}),e&&t.attrs.ondelete?m("button.remove",{onclick:t.attrs.ondelete}):null,t.state.loading?m("div.loading-spinner"):null])}};const o={files:[{type:"css",url:"https://cdn.jsdelivr.net/npm/froala-editor@3.0.4/css/froala_editor.pkgd.min.css"},{type:"css",url:"https://cdn.jsdelivr.net/npm/froala-editor@3.0.4/css/themes/gray.min.css"},{type:"js",url:"https://cdn.jsdelivr.net/npm/froala-editor@3.0.4/js/froala_editor.pkgd.min.js"}],loadedFiles:0,loadedFroala:!1,checkLoadedAll:function(t){o.loadedFiles<o.files.length||(o.loadedFroala=!0,t())},createFroalaScript:function(){return o.loadedFroala?Promise.resolve():new Promise(function(t){let e=function(){o.loadedFiles++,o.checkLoadedAll(t)},a=document.getElementsByTagName("head")[0];for(var i=0;i<o.files.length;i++){let t;"css"===o.files[i].type?((t=document.createElement("link")).setAttribute("rel","stylesheet"),t.setAttribute("type","text/css"),t.setAttribute("href",o.files[i].url)):((t=document.createElement("script")).setAttribute("type","text/javascript"),t.setAttribute("src",o.files[i].url)),t.onload=e,a.insertBefore(t,a.firstChild)}})}};var l=o,h={};const{sendRequest:d}=a,c=window.__nfptree||[];h.Tree=c,h.createPage=function(t){return d({method:"POST",url:"/api/pages",body:t}).then(function(t){if(t.children=[],t.parent_id){for(let e=0;e<c.length;e++)if(c[e].id===t.parent_id){c[e].children.push(t);break}}else c.push(t);return t})},h.updatePage=function(t,e){return d({method:"PUT",url:"/api/pages/"+t,body:e}).then(function(t){for(let e=0;e<c.length;e++){if(c[e].id===t.id){t.children=c[e].children,c[e]=t;break}if(c[e].id===t.parent_id){for(let a=0;a<c[e].children.length;a++)if(c[e].children[a].id===t.id){t.children=c[e].children[a].children,c[e].children[a]=t;break}break}}return t.children||(t.children=[]),t})},h.getAllPages=function(){return d({method:"GET",url:"/api/pages"})},h.getPage=function(t){return d({method:"GET",url:"/api/pages/"+t+"?includes=media,banner,children,news,news.media"})},h.removePage=function(t,e){return d({method:"DELETE",url:"/api/pages/"+e}).then(function(){for(let e=0;e<c.length;e++){if(c[e].id===t.id){c.splice(e,1);break}if(c[e].id===t.parent_id){for(let a=0;a<c[e].children.length;a++)if(c[e].children[a].id===t.id){c[e].children.splice(a,1);break}break}}return null})};const{createPage:u,updatePage:f,getPage:p,Tree:g}=h,v={getFroalaOptions:function(){return{theme:"gray",heightMin:150,videoUpload:!1,imageUploadURL:"/api/media",imageManagerLoadURL:"/api/media",imageManagerDeleteMethod:"DELETE",imageManagerDeleteURL:"/api/media",events:{"imageManager.beforeDeleteImage":function(t){this.opts.imageManagerDeleteURL="/api/media/"+t.data("id")}},requestHeaders:{Authorization:"Bearer "+t.getToken()}}},oninit:function(t){this.loading="add"!==m.route.param("key"),this.creating="add"===m.route.param("key"),this.error="",this.page={name:"",path:"",description:"",media:null},this.editedPath=!1,this.froala=null,this.loadedFroala=l.loadedFroala,"add"!==m.route.param("key")&&p(m.route.param("key")).then(function(e){t.state.editedPath=!0,t.state.page=e}).catch(function(e){t.state.error=e.message}).then(function(){t.state.loading=!1,m.redraw()}),this.loadedFroala||l.createFroalaScript().then(function(){t.state.loadedFroala=!0,m.redraw()})},updateValue:function(t,e){this.page[t]=e.currentTarget.value,"path"===t?this.editedPath=!0:"name"!==t||this.editedPath||(this.page.path=this.page.name.toLowerCase().replace(/ /g,"-"))},updateParent:function(t){this.page.parent_id=Number(t.currentTarget.value),-1===this.page.parent_id&&(this.page.parent_id=null)},fileUploaded:function(t,e){this.page[t]=e},fileRemoved:function(t){this.page[t]=null},save:function(t,e){if(e.preventDefault(),this.page.name?this.page.path||(this.error="Path is missing"):this.error="Name is missing",this.error)return;let a;return this.page.description=t.state.froala?t.state.froala.html.get():this.page.description,this.page.description&&(this.page.description=this.page.description.replace(/<p[^>]+data-f-id="pbf"[^>]+>[^>]+>[^>]+>[^>]+>/,"")),this.loading=!0,(a=this.page.id?f(this.page.id,{name:this.page.name,path:this.page.path,parent_id:this.page.parent_id,description:this.page.description,banner_id:this.page.banner&&this.page.banner.id||null,media_id:this.page.media&&this.page.media.id||null}):u({name:this.page.name,path:this.page.path,parent_id:this.page.parent_id,description:this.page.description,banner_id:this.page.banner&&this.page.banner.id||null,media_id:this.page.media&&this.page.media.id||null})).then(function(e){t.state.page.id?(e.media=t.state.page.media,e.banner=t.state.page.banner,t.state.page=e):m.route.set("/admin/pages/"+e.id)}).catch(function(e){t.state.error=e.message}).then(function(){t.state.loading=!1,m.redraw()}),!1},view:function(t){const e=[{id:null,name:"-- Frontpage --"}].concat(g).filter(function(e){return!t.state.page||e.id!==t.state.page.id});return this.loading?m("div.loading-spinner"):m("div.admin-wrapper",[m("div.admin-actions",this.page.id?[m("span","Actions:"),m(m.route.Link,{href:"/page/"+this.page.path},"View page"),m(m.route.Link,{href:"/admin/pages/add"},"Create new page")]:null),m("article.editpage",[m("header",m("h1",this.creating?"Create Page":"Edit "+(this.page.name||"(untitled)"))),m("div.error",{hidden:!this.error,onclick:function(){t.state.error=""}},this.error),m(s,{onupload:this.fileUploaded.bind(this,"banner"),ondelete:this.fileRemoved.bind(this,"banner"),onerror:function(e){t.state.error=e},media:this.page&&this.page.banner}),m(s,{class:"cover",useimg:!0,onupload:this.fileUploaded.bind(this,"media"),ondelete:this.fileRemoved.bind(this,"media"),onerror:function(e){t.state.error=e},media:this.page&&this.page.media}),m("form.editpage.content",{onsubmit:this.save.bind(this,t)},[m("label","Parent"),m("select",{onchange:this.updateParent.bind(this)},e.map(function(e){return m("option",{value:e.id||-1,selected:e.id===t.state.page.parent_id},e.name)})),m("label","Name"),m("input",{type:"text",value:this.page.name,oninput:this.updateValue.bind(this,"name")}),m("label","Description"),this.loadedFroala?m("div",{oncreate:function(e){t.state.froala=new FroalaEditor(e.dom,v.getFroalaOptions(),function(){t.state.froala.html.set(t.state.page.description)})}}):null,m("label","Path"),m("input",{type:"text",value:this.page.path,oninput:this.updateValue.bind(this,"path")}),m("div.loading-spinner",{hidden:this.loadedFroala}),m("input",{type:"submit",value:"Save"})])])])}};var b=v;var y={view:function(t){return m("div.floating-container",{hidden:t.attrs.hidden},m("dialogue",[m("h2",t.attrs.title),m("p",t.attrs.message),m("div.buttons",[m("button",{class:t.attrs.yesclass||"",onclick:t.attrs.onyes},t.attrs.yes),m("button",{class:t.attrs.noclass||"",onclick:t.attrs.onno},t.attrs.no)])]))}};const{getAllPages:w,removePage:k}=h,A={parseTree:function(t){let e=new Map;for(let a=0;a<t.length;a++)t[a].children=[],e.set(t[a].id,t[a]);for(let a=0;a<t.length;a++)t[a].parent_id&&e.has(t[a].parent_id)&&(e.get(t[a].parent_id).children.push(t[a]),t.splice(a,1),a--);return t},oninit:function(t){this.loading=!0,this.error="",this.pages=[],this.removePage=null,w().then(function(e){t.state.pages=A.parseTree(e)}).catch(function(e){t.state.error=e.message}).then(function(){t.state.loading=!1,m.redraw()})},confirmRemovePage:function(t){let e=this.removePage;this.removePage=null,this.loading=!0,k(e,e.id).then(this.oninit.bind(this,t)).catch(function(e){t.state.error=e.message,t.state.loading=!1,m.redraw()})},drawPage:function(t,e){return[m("tr",[m("td",[e.parent_id?m("span.subpage","| >"):null,m(m.route.Link,{href:"/admin/pages/"+e.id},e.name)]),m("td",m(m.route.Link,{href:"/page/"+e.path},"/page/"+e.path)),m("td.right",e.updated_at.replace("T"," ").split(".")[0]),m("td.right",m("button",{onclick:function(){t.state.removePage=e}},"Remove"))])].concat(e.children.map(A.drawPage.bind(this,t)))},view:function(t){return[this.loading?m("div.loading-spinner"):m("div.admin-wrapper",[m("div.admin-actions",[m("span","Actions:"),m(m.route.Link,{href:"/admin/pages/add"},"Create new page")]),m("article.editpage",[m("header",m("h1","All pages")),m("div.error",{hidden:!this.error,onclick:function(){t.state.error=""}},this.error),m("table",[m("thead",m("tr",[m("th","Title"),m("th","Path"),m("th.right","Updated"),m("th.right","Actions")])),m("tbody",this.pages.map(A.drawPage.bind(this,t)))])])]),m(y,{hidden:null===t.state.removePage,title:"Delete "+(t.state.removePage?t.state.removePage.name:""),message:'Are you sure you want to remove "'+(t.state.removePage?t.state.removePage.name:"")+'" ('+(t.state.removePage?t.state.removePage.path:"")+")",yes:"Remove",yesclass:"alert",no:"Cancel",noclass:"cancel",onyes:this.confirmRemovePage.bind(this,t),onno:function(){t.state.removePage=null}})]}};var P=A,x={};const{sendRequest:S}=a;function F(t,e){return Object.prototype.hasOwnProperty.call(t,e)}x.createArticle=function(t){return S({method:"POST",url:"/api/articles",body:t})},x.updateArticle=function(t,e){return S({method:"PUT",url:"/api/articles/"+t,body:e})},x.getAllArticlesPagination=function(t){let e="";return t.sort&&(e+="&sort="+t.sort),t.per_page&&(e+="&perPage="+t.per_page),t.page&&(e+="&page="+t.page),t.includes&&(e+="&includes="+t.includes.join(",")),"/api/articles?"+e},x.getArticle=function(t){return S({method:"GET",url:"/api/articles/"+t+"?includes=media,parent,banner,files"})},x.removeArticle=function(t,e){return S({method:"DELETE",url:"/api/articles/"+e})};var L=Array.isArray||function(t){return"[object Array]"===Object.prototype.toString.call(t)},T=function(t){switch(typeof t){case"string":return t;case"boolean":return t?"true":"false";case"number":return isFinite(t)?t:"";default:return""}},O=Array.isArray||function(t){return"[object Array]"===Object.prototype.toString.call(t)};function j(t,e){if(t.map)return t.map(e);for(var a=[],i=0;i<t.length;i++)a.push(e(t[i],i));return a}var _=Object.keys||function(t){var e=[];for(var a in t)Object.prototype.hasOwnProperty.call(t,a)&&e.push(a);return e},E={parse:function(t,e,a,i){e=e||"&",a=a||"=";var n={};if("string"!=typeof t||0===t.length)return n;var r=/\+/g;t=t.split(e);var s=1e3;i&&"number"==typeof i.maxKeys&&(s=i.maxKeys);var o=t.length;s>0&&o>s&&(o=s);for(var l=0;l<o;++l){var h,d,c,u,m=t[l].replace(r,"%20"),f=m.indexOf(a);f>=0?(h=m.substr(0,f),d=m.substr(f+1)):(h=m,d=""),c=decodeURIComponent(h),u=decodeURIComponent(d),F(n,c)?L(n[c])?n[c].push(u):n[c]=[n[c],u]:n[c]=u}return n},stringify:function(t,e,a,i){return e=e||"&",a=a||"=",null===t&&(t=void 0),"object"==typeof t?j(_(t),function(i){var n=encodeURIComponent(T(i))+a;return O(t[i])?j(t[i],function(t){return n+encodeURIComponent(T(t))}).join(e):n+encodeURIComponent(T(t[i]))}).join(e):i?encodeURIComponent(T(i))+a+encodeURIComponent(T(t)):""}},R={exports:{}};(function(t){!function(e){var a="object"==typeof R.exports&&R.exports&&!R.exports.nodeType&&R.exports,i=R&&!R.nodeType&&R,n="object"==typeof t&&t;n.global!==n&&n.window!==n&&n.self!==n||(e=n);var r,s,o=2147483647,l=36,h=1,d=26,c=38,u=700,m=72,f=128,p="-",g=/^xn--/,v=/[^\x20-\x7E]/,b=/[\x2E\u3002\uFF0E\uFF61]/g,y={overflow:"Overflow: input needs wider integers to process","not-basic":"Illegal input >= 0x80 (not a basic code point)","invalid-input":"Invalid input"},w=l-h,k=Math.floor,A=String.fromCharCode;function P(t){throw new RangeError(y[t])}function x(t,e){for(var a=t.length,i=[];a--;)i[a]=e(t[a]);return i}function S(t,e){var a=t.split("@"),i="";return a.length>1&&(i=a[0]+"@",t=a[1]),i+x((t=t.replace(b,".")).split("."),e).join(".")}function F(t){for(var e,a,i=[],n=0,r=t.length;n<r;)(e=t.charCodeAt(n++))>=55296&&e<=56319&&n<r?56320==(64512&(a=t.charCodeAt(n++)))?i.push(((1023&e)<<10)+(1023&a)+65536):(i.push(e),n--):i.push(e);return i}function L(t){return x(t,function(t){var e="";return t>65535&&(e+=A((t-=65536)>>>10&1023|55296),t=56320|1023&t),e+A(t)}).join("")}function T(t,e){return t+22+75*(t<26)-((0!=e)<<5)}function O(t,e,a){var i=0;for(t=a?k(t/u):t>>1,t+=k(t/e);t>w*d>>1;i+=l)t=k(t/w);return k(i+(w+1)*t/(t+c))}function j(t){var e,a,i,n,r,s,c,u,g,v,b,y=[],w=t.length,A=0,x=f,S=m;for((a=t.lastIndexOf(p))<0&&(a=0),i=0;i<a;++i)t.charCodeAt(i)>=128&&P("not-basic"),y.push(t.charCodeAt(i));for(n=a>0?a+1:0;n<w;){for(r=A,s=1,c=l;n>=w&&P("invalid-input"),((u=(b=t.charCodeAt(n++))-48<10?b-22:b-65<26?b-65:b-97<26?b-97:l)>=l||u>k((o-A)/s))&&P("overflow"),A+=u*s,!(u<(g=c<=S?h:c>=S+d?d:c-S));c+=l)s>k(o/(v=l-g))&&P("overflow"),s*=v;S=O(A-r,e=y.length+1,0==r),k(A/e)>o-x&&P("overflow"),x+=k(A/e),A%=e,y.splice(A++,0,x)}return L(y)}function _(t){var e,a,i,n,r,s,c,u,g,v,b,y,w,x,S,L=[];for(y=(t=F(t)).length,e=f,a=0,r=m,s=0;s<y;++s)(b=t[s])<128&&L.push(A(b));for(i=n=L.length,n&&L.push(p);i<y;){for(c=o,s=0;s<y;++s)(b=t[s])>=e&&b<c&&(c=b);for(c-e>k((o-a)/(w=i+1))&&P("overflow"),a+=(c-e)*w,e=c,s=0;s<y;++s)if((b=t[s])<e&&++a>o&&P("overflow"),b==e){for(u=a,g=l;!(u<(v=g<=r?h:g>=r+d?d:g-r));g+=l)S=u-v,x=l-v,L.push(A(T(v+S%x,0))),u=k(S/x);L.push(A(T(u,0))),r=O(a,w,i==n),a=0,++i}++a,++e}return L.join("")}if(r={version:"1.4.1",ucs2:{decode:F,encode:L},decode:j,encode:_,toASCII:function(t){return S(t,function(t){return v.test(t)?"xn--"+_(t):t})},toUnicode:function(t){return S(t,function(t){return g.test(t)?j(t.slice(4).toLowerCase()):t})}},"function"==typeof define&&"object"==typeof define.amd&&define.amd)define("punycode",function(){return r});else if(a&&i)if(R.exports==a)i.exports=r;else for(s in r)r.hasOwnProperty(s)&&(a[s]=r[s]);else e.punycode=r}(this)}).call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{}),R=R.exports;var U={isString:function(t){return"string"==typeof t},isObject:function(t){return"object"==typeof t&&null!==t},isNull:function(t){return null===t},isNullOrUndefined:function(t){return null==t}},C={};function q(){this.protocol=null,this.slashes=null,this.auth=null,this.host=null,this.port=null,this.hostname=null,this.hash=null,this.search=null,this.query=null,this.pathname=null,this.path=null,this.href=null}C.parse=K;var D=/^([a-z0-9.+-]+:)/i,I=/:[0-9]*$/,M=/^(\/\/?(?!\/)[^\?\s]*)(\?[^\s]*)?$/,N=["{","}","|","\\","^","`"].concat(["<",">",'"',"`"," ","\r","\n","\t"]),G=["'"].concat(N),B=["%","/","?",";","#"].concat(G),V=["/","?","#"],z=/^[+a-z0-9A-Z_-]{0,63}$/,H=/^([+a-z0-9A-Z_-]{0,63})(.*)$/,$={javascript:!0,"javascript:":!0},J={javascript:!0,"javascript:":!0},Z={http:!0,https:!0,ftp:!0,gopher:!0,file:!0,"http:":!0,"https:":!0,"ftp:":!0,"gopher:":!0,"file:":!0};function K(t,e,a){if(t&&U.isObject(t)&&t instanceof q)return t;var i=new q;return i.parse(t,e,a),i}q.prototype.parse=function(t,e,a){if(!U.isString(t))throw new TypeError("Parameter 'url' must be a string, not "+typeof t);var i=t.indexOf("?"),n=-1!==i&&i<t.indexOf("#")?"?":"#",r=t.split(n);r[0]=r[0].replace(/\\/g,"/");var s=t=r.join(n);if(s=s.trim(),!a&&1===t.split("#").length){var o=M.exec(s);if(o)return this.path=s,this.href=s,this.pathname=o[1],o[2]?(this.search=o[2],this.query=e?E.parse(this.search.substr(1)):this.search.substr(1)):e&&(this.search="",this.query={}),this}var l=D.exec(s);if(l){var h=(l=l[0]).toLowerCase();this.protocol=h,s=s.substr(l.length)}if(a||l||s.match(/^\/\/[^@\/]+@[^@\/]+/)){var d="//"===s.substr(0,2);!d||l&&J[l]||(s=s.substr(2),this.slashes=!0)}if(!J[l]&&(d||l&&!Z[l])){for(var c,u,m=-1,f=0;f<V.length;f++)-1!==(p=s.indexOf(V[f]))&&(-1===m||p<m)&&(m=p);for(-1!==(u=-1===m?s.lastIndexOf("@"):s.lastIndexOf("@",m))&&(c=s.slice(0,u),s=s.slice(u+1),this.auth=decodeURIComponent(c)),m=-1,f=0;f<B.length;f++){var p;-1!==(p=s.indexOf(B[f]))&&(-1===m||p<m)&&(m=p)}-1===m&&(m=s.length),this.host=s.slice(0,m),s=s.slice(m),this.parseHost(),this.hostname=this.hostname||"";var g="["===this.hostname[0]&&"]"===this.hostname[this.hostname.length-1];if(!g)for(var v=this.hostname.split(/\./),b=(f=0,v.length);f<b;f++){var y=v[f];if(y&&!y.match(z)){for(var w="",k=0,A=y.length;k<A;k++)y.charCodeAt(k)>127?w+="x":w+=y[k];if(!w.match(z)){var P=v.slice(0,f),x=v.slice(f+1),S=y.match(H);S&&(P.push(S[1]),x.unshift(S[2])),x.length&&(s="/"+x.join(".")+s),this.hostname=P.join(".");break}}}this.hostname.length>255?this.hostname="":this.hostname=this.hostname.toLowerCase(),g||(this.hostname=R.toASCII(this.hostname));var F=this.port?":"+this.port:"",L=this.hostname||"";this.host=L+F,this.href+=this.host,g&&(this.hostname=this.hostname.substr(1,this.hostname.length-2),"/"!==s[0]&&(s="/"+s))}if(!$[h])for(f=0,b=G.length;f<b;f++){var T=G[f];if(-1!==s.indexOf(T)){var O=encodeURIComponent(T);O===T&&(O=escape(T)),s=s.split(T).join(O)}}var j=s.indexOf("#");-1!==j&&(this.hash=s.substr(j),s=s.slice(0,j));var _=s.indexOf("?");if(-1!==_?(this.search=s.substr(_),this.query=s.substr(_+1),e&&(this.query=E.parse(this.query)),s=s.slice(0,_)):e&&(this.search="",this.query={}),s&&(this.pathname=s),Z[h]&&this.hostname&&!this.pathname&&(this.pathname="/"),this.pathname||this.search){F=this.pathname||"";var C=this.search||"";this.path=F+C}return this.href=this.format(),this},q.prototype.format=function(){var t=this.auth||"";t&&(t=(t=encodeURIComponent(t)).replace(/%3A/i,":"),t+="@");var e=this.protocol||"",a=this.pathname||"",i=this.hash||"",n=!1,r="";this.host?n=t+this.host:this.hostname&&(n=t+(-1===this.hostname.indexOf(":")?this.hostname:"["+this.hostname+"]"),this.port&&(n+=":"+this.port)),this.query&&U.isObject(this.query)&&Object.keys(this.query).length&&(r=E.stringify(this.query));var s=this.search||r&&"?"+r||"";return e&&":"!==e.substr(-1)&&(e+=":"),this.slashes||(!e||Z[e])&&!1!==n?(n="//"+(n||""),a&&"/"!==a.charAt(0)&&(a="/"+a)):n||(n=""),i&&"#"!==i.charAt(0)&&(i="#"+i),s&&"?"!==s.charAt(0)&&(s="?"+s),e+n+(a=a.replace(/[?#]/g,function(t){return encodeURIComponent(t)}))+(s=s.replace("#","%23"))+i},q.prototype.resolve=function(t){return this.resolveObject(K(t,!1,!0)).format()},q.prototype.resolveObject=function(t){if(U.isString(t)){var e=new q;e.parse(t,!1,!0),t=e}for(var a=new q,i=Object.keys(this),n=0;n<i.length;n++){var r=i[n];a[r]=this[r]}if(a.hash=t.hash,""===t.href)return a.href=a.format(),a;if(t.slashes&&!t.protocol){for(var s=Object.keys(t),o=0;o<s.length;o++){var l=s[o];"protocol"!==l&&(a[l]=t[l])}return Z[a.protocol]&&a.hostname&&!a.pathname&&(a.path=a.pathname="/"),a.href=a.format(),a}if(t.protocol&&t.protocol!==a.protocol){if(!Z[t.protocol]){for(var h=Object.keys(t),d=0;d<h.length;d++){var c=h[d];a[c]=t[c]}return a.href=a.format(),a}if(a.protocol=t.protocol,t.host||J[t.protocol])a.pathname=t.pathname;else{for(var u=(t.pathname||"").split("/");u.length&&!(t.host=u.shift()););t.host||(t.host=""),t.hostname||(t.hostname=""),""!==u[0]&&u.unshift(""),u.length<2&&u.unshift(""),a.pathname=u.join("/")}if(a.search=t.search,a.query=t.query,a.host=t.host||"",a.auth=t.auth,a.hostname=t.hostname||t.host,a.port=t.port,a.pathname||a.search){var m=a.pathname||"",f=a.search||"";a.path=m+f}return a.slashes=a.slashes||t.slashes,a.href=a.format(),a}var p=a.pathname&&"/"===a.pathname.charAt(0),g=t.host||t.pathname&&"/"===t.pathname.charAt(0),v=g||p||a.host&&t.pathname,b=v,y=a.pathname&&a.pathname.split("/")||[],w=(u=t.pathname&&t.pathname.split("/")||[],a.protocol&&!Z[a.protocol]);if(w&&(a.hostname="",a.port=null,a.host&&(""===y[0]?y[0]=a.host:y.unshift(a.host)),a.host="",t.protocol&&(t.hostname=null,t.port=null,t.host&&(""===u[0]?u[0]=t.host:u.unshift(t.host)),t.host=null),v=v&&(""===u[0]||""===y[0])),g)a.host=t.host||""===t.host?t.host:a.host,a.hostname=t.hostname||""===t.hostname?t.hostname:a.hostname,a.search=t.search,a.query=t.query,y=u;else if(u.length)y||(y=[]),y.pop(),y=y.concat(u),a.search=t.search,a.query=t.query;else if(!U.isNullOrUndefined(t.search))return w&&(a.hostname=a.host=y.shift(),(S=!!(a.host&&a.host.indexOf("@")>0)&&a.host.split("@"))&&(a.auth=S.shift(),a.host=a.hostname=S.shift())),a.search=t.search,a.query=t.query,U.isNull(a.pathname)&&U.isNull(a.search)||(a.path=(a.pathname?a.pathname:"")+(a.search?a.search:"")),a.href=a.format(),a;if(!y.length)return a.pathname=null,a.search?a.path="/"+a.search:a.path=null,a.href=a.format(),a;for(var k=y.slice(-1)[0],A=(a.host||t.host||y.length>1)&&("."===k||".."===k)||""===k,P=0,x=y.length;x>=0;x--)"."===(k=y[x])?y.splice(x,1):".."===k?(y.splice(x,1),P++):P&&(y.splice(x,1),P--);if(!v&&!b)for(;P--;P)y.unshift("..");!v||""===y[0]||y[0]&&"/"===y[0].charAt(0)||y.unshift(""),A&&"/"!==y.join("/").substr(-1)&&y.push("");var S,F=""===y[0]||y[0]&&"/"===y[0].charAt(0);return w&&(a.hostname=a.host=F?"":y.length?y.shift():"",(S=!!(a.host&&a.host.indexOf("@")>0)&&a.host.split("@"))&&(a.auth=S.shift(),a.host=a.hostname=S.shift())),(v=v||a.host&&y.length)&&!F&&y.unshift(""),y.length?a.pathname=y.join("/"):(a.pathname=null,a.path=null),U.isNull(a.pathname)&&U.isNull(a.search)||(a.path=(a.pathname?a.pathname:"")+(a.search?a.search:"")),a.auth=t.auth||a.auth,a.slashes=a.slashes||t.slashes,a.href=a.format(),a},q.prototype.parseHost=function(){var t=this.host,e=I.exec(t);e&&(":"!==(e=e[0])&&(this.port=e.substr(1)),t=t.substr(0,t.length-e.length)),t&&(this.hostname=t)};var W=function(){for(var t={},e=0;e<arguments.length;e++){var a=arguments[e];for(var i in a)Y.call(a,i)&&(t[i]=a[i])}return t},Y=Object.prototype.hasOwnProperty;function Q(t){return t&&t.rel}function X(t,e){return e.rel.split(/\s+/).forEach(function(a){t[a]=W(e,{rel:a})}),t}function tt(t,e){var a=e.match(/\s*(.+)\s*=\s*"?([^"]+)"?/);return a&&(t[a[1]]=a[2]),t}function et(t){try{var e=t.match(/<?([^>]*)>(.*)/),a=e[1],i=e[2].split(";"),n=C.parse(a),r=E.parse(n.query);i.shift();var s=i.reduce(tt,{});return(s=W(r,s)).url=a,s}catch(o){return null}}var at=function(t){return t?t.split(/,\s*</).map(et).filter(Q).reduce(X,{}):null},it={};const{sendRequest:nt}=a;it.fetchPage=function(t){return nt({method:"GET",url:t},!0).then(t=>({data:t.data,links:at(t.headers.link||""),total:Number(t.headers.pagination_total||"0")}))};var rt={oninit:function(t){this.onpage=t.attrs.onpage||function(){}},view:function(t){return t.attrs.links?m("pages",[t.attrs.links.first?m(m.route.Link,{href:t.attrs.base+"?page="+t.attrs.links.first.page,onclick:function(){t.state.onpage(t.attrs.links.first.page)}},"First"):m("div"),t.attrs.links.previous?m(m.route.Link,{href:t.attrs.base+"?page="+t.attrs.links.previous.page,onclick:function(){t.state.onpage(t.attrs.links.previous.page)}},t.attrs.links.previous.title):m("div"),m("div",t.attrs.links.current&&t.attrs.links.current.title||"Current page"),t.attrs.links.next?m(m.route.Link,{href:t.attrs.base+"?page="+t.attrs.links.next.page,onclick:function(){t.state.onpage(t.attrs.links.next.page)}},t.attrs.links.next.title):m("div"),t.attrs.links.last?m(m.route.Link,{href:t.attrs.base+"?page="+t.attrs.links.last.page,onclick:function(){t.state.onpage(t.attrs.links.last.page)}},"Last"):m("div")]):null}};const{getAllArticlesPagination:st,removeArticle:ot}=x,{fetchPage:lt}=it,ht={oninit:function(t){this.error="",this.lastpage=m.route.param("page")||"1",this.articles=[],this.removeArticle=null,this.fetchArticles(t)},onupdate:function(t){m.route.param("page")&&m.route.param("page")!==this.lastpage&&this.fetchArticles(t)},fetchArticles:function(t){return this.loading=!0,this.links=null,this.lastpage=m.route.param("page")||"1",lt(st({per_page:10,page:this.lastpage,includes:["parent"]})).then(function(e){t.state.articles=e.data,t.state.links=e.links}).catch(function(e){t.state.error=e.message}).then(function(){t.state.loading=!1,m.redraw()})},confirmRemoveArticle:function(t){let e=this.removeArticle;this.removeArticle=null,this.loading=!0,ot(e,e.id).then(this.oninit.bind(this,t)).catch(function(e){t.state.error=e.message,t.state.loading=!1,m.redraw()})},drawArticle:function(t,e){let a;return a=e.parent?{path:"/page/"+e.parent.path,name:e.parent.name}:{path:"/",name:"-- Frontpage --"},[m("tr",[m("td",m(m.route.Link,{href:"/admin/articles/"+e.id},e.name)),m("td",m(m.route.Link,{href:a.path},a.name)),m("td",m(m.route.Link,{href:"/article/"+e.path},"/article/"+e.path)),m("td.right",e.updated_at.replace("T"," ").split(".")[0]),m("td.right",m("button",{onclick:function(){t.state.removeArticle=e}},"Remove"))])]},view:function(t){return[m("div.admin-wrapper",[m("div.admin-actions",[m("span","Actions:"),m(m.route.Link,{href:"/admin/articles/add"},"Create new article")]),m("article.editarticle",[m("header",m("h1","All articles")),m("div.error",{hidden:!this.error,onclick:function(){t.state.error=""}},this.error),this.loading?m("div.loading-spinner.full"):m("table",[m("thead",m("tr",[m("th","Title"),m("th","Page"),m("th","Path"),m("th.right","Updated"),m("th.right","Actions")])),m("tbody",this.articles.map(ht.drawArticle.bind(this,t)))]),m(rt,{base:"/admin/articles",links:this.links})])]),m(y,{hidden:null===t.state.removeArticle,title:"Delete "+(t.state.removeArticle?t.state.removeArticle.name:""),message:'Are you sure you want to remove "'+(t.state.removeArticle?t.state.removeArticle.name:"")+'" ('+(t.state.removeArticle?t.state.removeArticle.path:"")+")",yes:"Remove",yesclass:"alert",no:"Cancel",noclass:"cancel",onyes:this.confirmRemoveArticle.bind(this,t),onno:function(){t.state.removeArticle=null}})]}};var dt=ht,ct={};const{sendRequest:ut}=a;ct.uploadFile=function(t,e){let a=new FormData;return a.append("file",e),ut({method:"POST",url:"/api/articles/"+t+"/file",body:a})};const mt={getPrefix:t=>t.attrs.file.filename.endsWith(".torrent")?t.attrs.file.filename.indexOf("720 ")>=0?"720p":t.attrs.file.filename.indexOf("1080 ")>=0?"1080p":t.attrs.file.filename.indexOf("480 ")>=0?"480p":"Other":t.attrs.file.filename.split(".").slice(-1),getTitle:t=>t.attrs.file.meta.torrent?t.attrs.file.meta.torrent.name:t.attrs.file.filename,getDownloadName:t=>t.attrs.file.meta.torrent?"Torrent":"Download",getSize(t){var e=t,a=-1;do{e/=1024,a++}while(e>1024);return Math.max(e,.1).toFixed(1)+[" kB"," MB"," GB"," TB","PB","EB","ZB","YB"][a]},view:function(t){return m("fileinfo",{class:t.attrs.slim?"slim":""},[m("div.filetitle",[m("span.prefix",this.getPrefix(t)+":"),m("a",{target:"_blank",rel:"noopener",href:t.attrs.file.url},this.getDownloadName(t)),t.attrs.file.magnet?m("a",{href:t.attrs.file.magnet},"Magnet"):null,m("span",this.getTitle(t))]),t.attrs.file.meta.torrent&&!t.attrs.slim?m("ul",t.attrs.file.meta.torrent.files.map(function(t){return m("li",[t.name+" ",m("span.meta","("+mt.getSize(t.size)+")")])})):null])}};var ft=mt;const{Tree:pt}=h,{uploadFile:gt}=ct,{createArticle:vt,updateArticle:bt,getArticle:yt}=x,wt={getFroalaOptions:function(){return{theme:"gray",heightMin:150,videoUpload:!1,imageUploadURL:"/api/media",imageManagerLoadURL:"/api/media",imageManagerDeleteMethod:"DELETE",imageManagerDeleteURL:"/api/media",events:{"imageManager.beforeDeleteImage":function(t){this.opts.imageManagerDeleteURL="/api/media/"+t.data("id")}},requestHeaders:{Authorization:"Bearer "+t.getToken()}}},oninit:function(t){this.froala=null,this.loadedFroala=l.loadedFroala,this.loadedFroala||l.createFroalaScript().then(function(){t.state.loadedFroala=!0,m.redraw()}),this.fetchArticle(t)},onupdate:function(t){this.lastid!==m.route.param("id")&&this.fetchArticle(t)},fetchArticle:function(t){this.lastid=m.route.param("id"),this.loading="add"!==this.lastid,this.creating="add"===this.lastid,this.loadingFile=!1,this.error="",this.article={name:"",path:"",description:"",media:null,banner:null,files:[]},this.editedPath=!1,this.froala=null,this.loadedFroala=l.loadedFroala,"add"!==this.lastid&&yt(this.lastid).then(function(e){t.state.editedPath=!0,t.state.article=e}).catch(function(e){t.state.error=e.message}).then(function(){t.state.loading=!1,m.redraw()})},updateValue:function(t,e){this.article[t]=e.currentTarget.value,"path"===t?this.editedPath=!0:"name"!==t||this.editedPath||(this.article.path=this.article.name.toLowerCase().replace(/ /g,"-"))},updateParent:function(t){this.article.parent_id=Number(t.currentTarget.value),-1===this.article.parent_id&&(this.article.parent_id=null)},mediaUploaded:function(t,e){this.article[t]=e},mediaRemoved:function(t){this.article[t]=null},save:function(t,e){if(e.preventDefault(),this.article.name?this.article.path?this.error="":this.error="Path is missing":this.error="Name is missing",this.error)return;let a;this.article.description=t.state.froala&&t.state.froala.html.get()||this.article.description,this.article.description&&(this.article.description=this.article.description.replace(/<p[^>]+data-f-id="pbf"[^>]+>[^>]+>[^>]+>[^>]+>/,"")),this.loading=!0,(a=this.article.id?bt(this.article.id,{name:this.article.name,path:this.article.path,parent_id:this.article.parent_id,description:this.article.description,banner_id:this.article.banner&&this.article.banner.id,media_id:this.article.media&&this.article.media.id}):vt({name:this.article.name,path:this.article.path,parent_id:this.article.parent_id,description:this.article.description,banner_id:this.article.banner&&this.article.banner.id,media_id:this.article.media&&this.article.media.id})).then(function(e){t.state.article.id?(e.media=t.state.article.media,e.banner=t.state.article.banner,e.files=t.state.article.files,t.state.article=e):m.route.set("/admin/articles/"+e.id)}).catch(function(e){t.state.error=e.message}).then(function(){t.state.loading=!1,m.redraw()})},uploadFile(t,e){e.target.files[0]&&(t.state.error="",t.state.loadingFile=!0,gt(this.article.id,e.target.files[0]).then(function(e){t.state.article.files.push(e)}).catch(function(e){t.state.error=e.message}).then(function(){e.target.value=null,t.state.loadingFile=!1,m.redraw()}))},getFlatTree:function(){let t=[{id:null,name:"-- Frontpage --"}];return pt.forEach(function(e){t.push({id:e.id,name:e.name}),e.children.length&&e.children.forEach(function(a){t.push({id:a.id,name:e.name+" -> "+a.name})})}),t},view:function(t){const e=this.getFlatTree();return this.loading?m("div.loading-spinner"):m("div.admin-wrapper",[m("div.admin-actions",this.article.id?[m("span","Actions:"),m(m.route.Link,{href:"/article/"+this.article.path},"View article")]:null),m("article.editarticle",[m("header",m("h1",this.creating?"Create Article":"Edit "+(this.article.name||"(untitled)"))),m("div.error",{hidden:!this.error,onclick:function(){t.state.error=""}},this.error),m(s,{onupload:this.mediaUploaded.bind(this,"banner"),onerror:function(e){t.state.error=e},ondelete:this.mediaRemoved.bind(this,"banner"),media:this.article&&this.article.banner}),m(s,{class:"cover",useimg:!0,onupload:this.mediaUploaded.bind(this,"media"),ondelete:this.mediaRemoved.bind(this,"media"),onerror:function(e){t.state.error=e},media:this.article&&this.article.media}),m("form.editarticle.content",{onsubmit:this.save.bind(this,t)},[m("label","Parent"),m("select",{onchange:this.updateParent.bind(this)},e.map(function(e){return m("option",{value:e.id||-1,selected:e.id===t.state.article.parent_id},e.name)})),m("label","Name"),m("input",{type:"text",value:this.article.name,oninput:this.updateValue.bind(this,"name")}),m("label","Description"),this.loadedFroala?m("div",{oncreate:function(e){t.state.froala=new FroalaEditor(e.dom,wt.getFroalaOptions(),function(){t.state.froala.html.set(t.state.article.description)})}}):null,m("label","Path"),m("input",{type:"text",value:this.article.path,oninput:this.updateValue.bind(this,"path")}),m("div.loading-spinner",{hidden:this.loadedFroala}),m("input",{type:"submit",value:"Save"})]),this.article.files.length?m("files",[m("h4","Files"),this.article.files.map(function(t){return m(ft,{file:t})})]):null,this.article.id?m("div.fileupload",["Add file",m("input",{accept:"*",type:"file",onchange:this.uploadFile.bind(this,t)}),t.state.loadingFile?m("div.loading-spinner"):null]):null])])}};var kt=wt,At={};const{sendRequest:Pt}=a;At.createStaff=function(t){return Pt({method:"POST",url:"/api/staff",body:t})},At.updateStaff=function(t,e){return Pt({method:"PUT",url:"/api/staff/"+t,body:e})},At.getAllStaff=function(){return Pt({method:"GET",url:"/api/staff"})},At.getStaff=function(t){return Pt({method:"GET",url:"/api/staff/"+t})},At.removeStaff=function(t){return Pt({method:"DELETE",url:"/api/staff/"+t})};const{getAllStaff:xt,removeStaff:St}=At,Ft={oninit:function(t){this.error="",this.lastpage=m.route.param("page")||"1",this.staff=[],this.removeStaff=null,this.fetchStaffs(t)},fetchStaffs:function(t){return this.loading=!0,xt().then(function(e){t.state.staff=e}).catch(function(e){t.state.error=e.message}).then(function(){t.state.loading=!1,m.redraw()})},confirmRemoveStaff:function(t){let e=this.removeStaff;this.removeStaff=null,this.loading=!0,St(e.id).then(this.oninit.bind(this,t)).catch(function(e){t.state.error=e.message,t.state.loading=!1,m.redraw()})},getLevel:function(t){return 100===t?"Admin":"Manager"},view:function(t){return[m("div.admin-wrapper",[m("div.admin-actions",[m("span","Actions:"),m(m.route.Link,{href:"/admin/staff/add"},"Create new staff")]),m("article.editarticle",[m("header",m("h1","All staff")),m("div.error",{hidden:!this.error,onclick:function(){t.state.error=""}},this.error),this.loading?m("div.loading-spinner.full"):m("table",[m("thead",m("tr",[m("th","Fullname"),m("th","Email"),m("th","Level"),m("th.right","Updated"),m("th.right","Actions")])),m("tbody",this.staff.map(function(e){return m("tr",[m("td",m(m.route.Link,{href:"/admin/staff/"+e.id},e.fullname)),m("td",e.email),m("td.right",Ft.getLevel(e.level)),m("td.right",(e.updated_at||"---").replace("T"," ").split(".")[0]),m("td.right",m("button",{onclick:function(){t.state.removeStaff=e}},"Remove"))])}))]),m(rt,{base:"/admin/staff",links:this.links})])]),m(y,{hidden:null===t.state.removeStaff,title:"Delete "+(t.state.removeStaff?t.state.removeStaff.name:""),message:'Are you sure you want to remove "'+(t.state.removeStaff?t.state.removeStaff.fullname:"")+'" ('+(t.state.removeStaff?t.state.removeStaff.email:"")+")",yes:"Remove",yesclass:"alert",no:"Cancel",noclass:"cancel",onyes:this.confirmRemoveStaff.bind(this,t),onno:function(){t.state.removeStaff=null}})]}};var Lt=Ft;const{createStaff:Tt,updateStaff:Ot,getStaff:jt}=At;var _t={oninit:function(t){this.fetchStaff(t)},onupdate:function(t){this.lastid!==m.route.param("id")&&this.fetchStaff(t)},fetchStaff:function(t){this.lastid=m.route.param("id"),this.loading="add"!==this.lastid,this.creating="add"===this.lastid,this.error="",this.staff={fullname:"",email:"",password:"",level:10},"add"!==this.lastid&&jt(this.lastid).then(function(e){t.state.editedPath=!0,t.state.staff=e}).catch(function(e){t.state.error=e.message}).then(function(){t.state.loading=!1,m.redraw()})},updateValue:function(t,e){this.staff[t]=e.currentTarget.value},save:function(t,e){if(e.preventDefault(),this.staff.fullname?this.staff.email?this.error="":this.error="Email is missing":this.error="Fullname is missing",this.error)return;let a;this.staff.description=t.state.froala&&t.state.froala.html.get()||this.staff.description,this.loading=!0,(a=this.staff.id?Ot(this.staff.id,{fullname:this.staff.fullname,email:this.staff.email,level:this.staff.level,password:this.staff.password}):Tt({fullname:this.staff.fullname,email:this.staff.email,level:this.staff.level,password:this.staff.password})).then(function(t){m.route.set("/admin/staff")}).catch(function(e){t.state.error=e.message}).then(function(){t.state.loading=!1,m.redraw()})},updateLevel:function(t){this.staff.level=Number(t.currentTarget.value)},view:function(t){return this.loading?m("div.loading-spinner"):m("div.admin-wrapper",[m("div.admin-actions",this.staff.id?[m("span","Actions:"),m(m.route.Link,{href:"/admin/staff"},"Staff list")]:null),m("article.editstaff",[m("header",m("h1",this.creating?"Create Staff":"Edit "+(this.staff.fullname||"(untitled)"))),m("div.error",{hidden:!this.error,onclick:function(){t.state.error=""}},this.error),m("form.editstaff.content",{onsubmit:this.save.bind(this,t)},[m("label","Level"),m("select",{onchange:this.updateLevel.bind(this)},[[10,"Manager"],[100,"Admin"]].map(function(e){return m("option",{value:e[0],selected:e[0]===t.state.staff.level},e[1])})),m("label","Fullname"),m("input",{type:"text",value:this.staff.fullname,oninput:this.updateValue.bind(this,"fullname")}),m("label","Email"),m("input",{type:"text",value:this.staff.email,oninput:this.updateValue.bind(this,"email")}),m("label","Password (optional)"),m("input",{type:"text",value:this.staff.password,oninput:this.updateValue.bind(this,"password")}),m("input",{type:"submit",value:"Save"})])])])}};window.addAdminRoutes=[["/admin/pages",P],["/admin/pages/:key",b],["/admin/articles",dt],["/admin/articles/:id",kt],["/admin/staff",Lt],["/admin/staff/:id",_t]]}();