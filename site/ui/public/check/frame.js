(()=>{var xY=[["aria-describedby","ariaDescribedByElements"],["aria-labelledby","ariaLabelledByElements"]];class g9{constructor(W,J){this.host=W,this.target=J.target,W.addController(this)}forward(){let W=this.target();if(!W)return;let J=this.host.getRootNode();for(let[Z,K]of xY){if(!(K in W))continue;let Y=(this.host.getAttribute(Z)??"").split(/\s+/).filter(Boolean).map((X)=>J.getElementById?.(X)??null).filter((X)=>X!==null);W[K]=Y.length>0?Y:null}}hostConnected(){this.observer=new MutationObserver(()=>this.forward()),this.observer.observe(this.host,{attributeFilter:xY.map(([W])=>W)})}hostDisconnected(){this.observer?.disconnect(),this.observer=void 0}hostUpdated(){this.forward()}}class k4{#J;#Z;#K;constructor(W){this.#Z=!1,this.at=-1,this.axis="inline",this.#Y=(J)=>{if(this.axis==="none"||J.pointerType!=="mouse"&&J.pointerType!=="pen")return;let Z=this.#Q(),K=this.#J.readings,Q=this.axis==="block"?Z?.height:Z?.width;if(!Z||!Q||K===0)return;let Y=this.axis==="block"?J.clientY-Z.top:J.clientX-Z.left,X=Math.floor(Y/Q*K),$=Math.min(Math.max(X,0),K-1);if($!==this.at)this.at=$,this.#Z=!0,this.#J.requestUpdate()},this.#W=()=>{if(this.at!==-1)this.at=-1,this.#J.requestUpdate()},this.#J=W,W.addController(this)}hostConnected(){this.#J.addEventListener("pointermove",this.#Y),this.#J.addEventListener("pointerleave",this.#W)}hostDisconnected(){this.#J.removeEventListener("pointermove",this.#Y),this.#J.removeEventListener("pointerleave",this.#W),this.at=-1}hostUpdated(){if(!this.#Z)return;this.#Z=!1,this.#J.renderRoot.querySelector('[part="tooltip-anchor"]')?.reposition?.()}#Q(){return this.#K??=this.#J.renderRoot.querySelector('[part="plot"]')??void 0,this.#K?.getBoundingClientRect()}set(W){if(W!==this.at)this.at=W,this.#Z=!0,this.#J.requestUpdate()}#Y;#W}var n9=()=>typeof HTMLButtonElement!=="undefined"&&("commandForElement"in HTMLButtonElement.prototype);class l9 extends Event{constructor(W,J){super("command",{cancelable:!0});this.command=W,this.source=J}}class SJ{constructor(W,J){this.handle=(Z)=>{let K=Z.command,Q=this.options.commands[K];if(!Q)return;Q(Z.source)},this.host=W,this.options=J,W.addController(this)}hostConnected(){this.host.addEventListener("command",this.handle)}hostDisconnected(){this.host.removeEventListener("command",this.handle)}}class X8 extends CustomEvent{static{this.eventName="helix-before-open"}constructor(){super(X8.eventName,{bubbles:!1,cancelable:!0,composed:!1,detail:{open:!0}})}}class RJ extends CustomEvent{static{this.eventName="helix-before-close"}constructor(){super(RJ.eventName,{bubbles:!1,cancelable:!0,composed:!1,detail:{open:!1}})}}class $8 extends CustomEvent{static{this.eventName="helix-next"}constructor(){super($8.eventName,{bubbles:!0,cancelable:!1,composed:!0,detail:{to:"next"}})}}class q8 extends CustomEvent{static{this.eventName="helix-previous"}constructor(){super(q8.eventName,{bubbles:!0,cancelable:!1,composed:!0,detail:{to:"previous"}})}}class G8 extends CustomEvent{static{this.eventName="helix-tour-ask"}constructor(W){super(G8.eventName,{bubbles:!0,cancelable:!1,composed:!0,detail:W})}}class z8 extends Event{static{this.eventName="helix-sample-start"}constructor(){super(z8.eventName,{bubbles:!0,cancelable:!1,composed:!0})}}class V8 extends Event{static{this.eventName="helix-sample-end"}constructor(){super(V8.eventName,{bubbles:!0,cancelable:!1,composed:!0})}}class EJ extends CustomEvent{static{this.eventName="helix-dismiss"}constructor(W){super(EJ.eventName,{bubbles:!0,cancelable:!0,composed:!0,detail:W})}}class b1 extends CustomEvent{static{this.eventName="helix-before-activate"}constructor(W){super(b1.eventName,{bubbles:!0,cancelable:!0,composed:!0,detail:W})}}class F8 extends CustomEvent{static{this.eventName="helix-before-pin"}constructor(W){super(F8.eventName,{bubbles:!0,cancelable:!0,composed:!0,detail:W})}}class N8 extends CustomEvent{static{this.eventName="helix-before-resize"}constructor(W){super(N8.eventName,{bubbles:!0,cancelable:!0,composed:!0,detail:W})}}class O8 extends CustomEvent{static{this.eventName="helix-before-split"}constructor(W){super(O8.eventName,{bubbles:!0,cancelable:!0,composed:!0,detail:W})}}class B8 extends CustomEvent{static{this.eventName="helix-before-panel-resize"}constructor(W){super(B8.eventName,{bubbles:!0,cancelable:!0,composed:!0,detail:W})}}class A8 extends CustomEvent{static{this.eventName="helix-before-collapse"}constructor(W){super(A8.eventName,{bubbles:!0,cancelable:!0,composed:!0,detail:W})}}class D8 extends CustomEvent{static{this.eventName="helix-before-edit"}constructor(W){super(D8.eventName,{bubbles:!0,cancelable:!0,composed:!0,detail:W})}}class t0 extends CustomEvent{static{this.eventName="helix-before-change"}constructor(W){super(t0.eventName,{bubbles:!0,cancelable:!0,composed:!0,detail:W})}}class P8 extends CustomEvent{static{this.eventName="helix-before-toggle"}constructor(W){super(P8.eventName,{bubbles:!0,cancelable:!0,composed:!0,detail:W})}}class I8 extends CustomEvent{static{this.eventName="helix-create"}constructor(W){super(I8.eventName,{bubbles:!0,cancelable:!0,composed:!0,detail:W})}}class T8 extends CustomEvent{static{this.eventName="helix-copy"}constructor(W){super(T8.eventName,{bubbles:!0,composed:!0,detail:W})}}class U8 extends CustomEvent{static{this.eventName="helix-console"}constructor(W){super(U8.eventName,{bubbles:!0,cancelable:!1,composed:!0,detail:W})}}class wJ extends CustomEvent{static{this.eventName="helix-resize"}constructor(W){super(wJ.eventName,{bubbles:!0,cancelable:!1,composed:!0,detail:W})}}class C8 extends CustomEvent{static{this.eventName="helix-scrolled"}constructor(W){super(C8.eventName,{bubbles:!0,cancelable:!1,composed:!0,detail:W})}}class L8 extends CustomEvent{static{this.eventName="helix-caret"}constructor(W){super(L8.eventName,{bubbles:!0,cancelable:!1,composed:!0,detail:W})}}class f1 extends CustomEvent{static{this.eventName="helix-navigate"}constructor(W){super(f1.eventName,{bubbles:!0,cancelable:!0,composed:!0,detail:W})}}class bJ extends CustomEvent{static{this.eventName="helix-complete"}constructor(W){super(bJ.eventName,{bubbles:!0,cancelable:!1,composed:!0,detail:W})}}class fJ extends CustomEvent{static{this.eventName="helix-send"}constructor(W){super(fJ.eventName,{bubbles:!0,cancelable:!0,composed:!0,detail:W})}}class jJ extends CustomEvent{static{this.eventName="helix-read"}constructor(W){super(jJ.eventName,{bubbles:!0,cancelable:!0,composed:!0,detail:W})}}class M8 extends CustomEvent{static{this.eventName="helix-sort"}constructor(W){super(M8.eventName,{bubbles:!0,cancelable:!0,composed:!0,detail:W})}}class _J extends CustomEvent{static{this.eventName="helix-filter"}constructor(W){super(_J.eventName,{bubbles:!0,cancelable:!0,composed:!0,detail:W})}}class S8 extends CustomEvent{static{this.eventName="helix-shortcut"}constructor(W){super(S8.eventName,{bubbles:!0,cancelable:!0,composed:!0,detail:W})}}class m extends CustomEvent{static{this.eventName="helix-select"}constructor(W){super(m.eventName,{bubbles:!0,cancelable:!0,composed:!0,detail:W})}}var gq={HelixBeforeActivateEvent:b1,HelixBeforeChangeEvent:t0,HelixBeforeCloseEvent:RJ,HelixBeforeCollapseEvent:A8,HelixBeforeEditEvent:D8,HelixBeforeOpenEvent:X8,HelixBeforePanelResizeEvent:B8,HelixBeforePinEvent:F8,HelixBeforeResizeEvent:N8,HelixBeforeSplitEvent:O8,HelixBeforeToggleEvent:P8,HelixCaretEvent:L8,HelixCompleteEvent:bJ,HelixConsoleEvent:U8,HelixCopyEvent:T8,HelixCreateEvent:I8,HelixDismissEvent:EJ,HelixFilterEvent:_J,HelixNavigateEvent:f1,HelixNextEvent:$8,HelixPreviousEvent:q8,HelixReadEvent:jJ,HelixResizeEvent:wJ,HelixSampleEndEvent:V8,HelixSampleStartEvent:z8,HelixScrolledEvent:C8,HelixSelectEvent:m,HelixSendEvent:fJ,HelixShortcutEvent:S8,HelixSortEvent:M8,HelixTourAskEvent:G8},yY=new Set(Object.values(gq).map((W)=>W.eventName));var nq=async(W)=>{try{return await navigator.clipboard.writeText(W),!0}catch{}let J=document.createElement("textarea");J.value=W,J.setAttribute("readonly",""),J.setAttribute("aria-hidden","true"),J.style.cssText="position:fixed;top:0;left:0;opacity:0;pointer-events:none",document.body.append(J),J.focus(),J.select();let Z=!1;try{Z=document.execCommand("copy")}catch{Z=!1}return J.remove(),Z};class R8{constructor(W,J={}){this.host=W,this.options=J,this.copied=!1,W.addController(this)}async copy(W){if(W==="")return;if(!await nq(W))return;if(this.host instanceof HTMLElement&&!this.host.isConnected)return;this.copied=!0,this.host.requestUpdate(),this.host.dispatchEvent(new T8({value:W})),this.reset(),this.timer=setTimeout(()=>{this.copied=!1,this.host.requestUpdate()},this.options.after??1200)}hostDisconnected(){this.reset(),this.copied=!1}reset(){if(this.timer!==void 0)clearTimeout(this.timer),this.timer=void 0}}var C5=new WeakMap,mY=(W,J)=>{for(let Z of J){if(W){if(!C5.has(Z))C5.set(Z,Z.disabled);Z.disabled=!0;continue}if(C5.has(Z))Z.disabled=C5.get(Z)??!1,C5.delete(Z)}};class j1{constructor(W,{items:J}){this.cascade=()=>{mY(this.host.disabled,this.items())},this.host=W,this.items=J,W.addController(this)}hostConnected(){this.host.renderRoot.addEventListener("slotchange",this.cascade)}hostDisconnected(){this.host.renderRoot.removeEventListener("slotchange",this.cascade)}hostUpdated(){this.cascade()}}var gF=["a[href]","button:not([disabled])","input:not([disabled])","select:not([disabled])","textarea:not([disabled])",'[contenteditable]:not([contenteditable="false"])','[tabindex]:not([tabindex="-1"])'].join(",");var L5=()=>{let W=document.activeElement;while(W?.shadowRoot?.activeElement)W=W.shadowRoot.activeElement;return W};var pY=(W)=>{let J=0,Z=W;while(Z)Z=Z.parentNode??Z.host??null,J+=1;return J},H4=new Set;class u4{constructor(W,{boundary:J,onDismiss:Z}){this.active=!1,this.handleKeydown=(K)=>{if(K.key!=="Escape")return;let Q=K;if(Q.helixDismissTaken)return;Q.helixDismissTaken=!0;let Y=this,X=pY(this.host);for(let $ of H4){let V=pY($.host);if(V>X)X=V,Y=$}Y.onDismiss()},this.handleWindowBlur=()=>{setTimeout(()=>{if(this.active&&L5()?.tagName==="IFRAME")this.onDismiss()})},this.handlePointerDown=(K)=>{let Q=this.boundary?.()??this.host,Y=(Array.isArray(Q)?Q:[Q]).filter(Boolean),X=K.composedPath();if(!Y.some(($)=>X.includes($)))this.onDismiss()},this.host=W,this.boundary=J,this.onDismiss=Z,W.addController(this)}activate(){if(this.active)return;this.active=!0,H4.add(this),document.addEventListener("keydown",this.handleKeydown),document.addEventListener("pointerdown",this.handlePointerDown),window.addEventListener("blur",this.handleWindowBlur)}deactivate(){if(!this.active)return;this.active=!1,H4.delete(this),document.removeEventListener("keydown",this.handleKeydown),document.removeEventListener("pointerdown",this.handlePointerDown),window.removeEventListener("blur",this.handleWindowBlur)}hostDisconnected(){this.deactivate()}}class E8{constructor(W,J){this.current=null,this.host=W,this.options=J,W.addController(this)}get here(){return this.current?.isConnected?this.current:null}get page(){return this.here}get atRoot(){return this.here===null}get depth(){let W=0;for(let J=this.here;J;J=this.parentOf(J))W+=1;return W}get label(){return[...this.here?.childNodes??[]].filter((W)=>W.nodeType===Node.TEXT_NODE).map((W)=>W.textContent?.trim()??"").filter(Boolean).join(" ")}get rows(){let W=this.options.slot??"page",J=this.options.isRow??(()=>!0);return(this.here?[...this.here.children].filter((K)=>K.slot===W):this.options.root()).filter(J)}hasPage(W){let J=this.options.slot??"page";return[...W.children].some((Z)=>Z.slot===J)}enter(W){if(!this.hasPage(W))return!1;return this.current=W,this.host.requestUpdate(),!0}back(){let W=this.here;if(W===null)return this.current=null,!1;return this.current=this.parentOf(W),this.host.requestUpdate(),!0}reset(){if(this.current===null)return;this.current=null,this.host.requestUpdate()}parentOf(W){let J=this.options.slot??"page";if(W.slot!==J)return null;let Z=W.parentElement;return Z&&(this.options.isRow??(()=>!0))(Z)?Z:null}hostDisconnected(){this.current=null}}var{min:_1,max:O1,round:S5,floor:R5}=Math,v1=(W)=>({x:W,y:W}),lq={left:"right",right:"left",bottom:"top",top:"bottom"};function h4(W,J,Z){return O1(W,_1(J,Z))}function z7(W,J){return typeof W==="function"?W(J):W}function vJ(W){return W.split("-")[0]}function V7(W){return W.split("-")[1]}function x4(W){return W==="x"?"y":"x"}function d9(W){return W==="y"?"height":"width"}function k1(W){let J=W[0];return J==="t"||J==="b"?"y":"x"}function i9(W){return x4(k1(W))}function lY(W,J,Z){if(Z===void 0)Z=!1;let K=V7(W),Q=i9(W),Y=d9(Q),X=Q==="x"?K===(Z?"end":"start")?"right":"left":K==="start"?"bottom":"top";if(J.reference[Y]>J.floating[Y])X=M5(X);return[X,M5(X)]}function cY(W){let J=M5(W);return[c9(W),J,c9(J)]}function c9(W){return W.includes("start")?W.replace("start","end"):W.replace("end","start")}var gY=["left","right"],nY=["right","left"],cq=["top","bottom"],dq=["bottom","top"];function iq(W,J,Z){switch(W){case"top":case"bottom":if(Z)return J?nY:gY;return J?gY:nY;case"left":case"right":return J?cq:dq;default:return[]}}function dY(W,J,Z,K){let Q=V7(W),Y=iq(vJ(W),Z==="start",K);if(Q){if(Y=Y.map((X)=>X+"-"+Q),J)Y=Y.concat(Y.map(c9))}return Y}function M5(W){let J=vJ(W);return lq[J]+W.slice(J.length)}function sq(W){var J,Z,K,Q;return{top:(J=W.top)!=null?J:0,right:(Z=W.right)!=null?Z:0,bottom:(K=W.bottom)!=null?K:0,left:(Q=W.left)!=null?Q:0}}function y4(W){return typeof W!=="number"?sq(W):{top:W,right:W,bottom:W,left:W}}function F7(W){let{x:J,y:Z,width:K,height:Q}=W;return{width:K,height:Q,top:Z,left:J,right:J+K,bottom:Z+Q,x:J,y:Z}}function iY(W,J,Z){let{reference:K,floating:Q}=W,Y=k1(J),X=i9(J),$=d9(X),V=vJ(J),O=Y==="y",B=K.x+K.width/2-Q.width/2,D=K.y+K.height/2-Q.height/2,P=K[$]/2-Q[$]/2,I;switch(V){case"top":I={x:B,y:K.y-Q.height};break;case"bottom":I={x:B,y:K.y+K.height};break;case"right":I={x:K.x+K.width,y:D};break;case"left":I={x:K.x-Q.width,y:D};break;default:I={x:K.x,y:K.y}}let C=V7(J);if(C)I[X]+=P*(C==="end"?1:-1)*(Z&&O?-1:1);return I}async function sY(W,J){var Z;if(J===void 0)J={};let{x:K,y:Q,platform:Y,rects:X,elements:$,strategy:V}=W,{boundary:O="clippingAncestors",rootBoundary:B="viewport",elementContext:D="floating",altBoundary:P=!1,padding:I=0}=z7(J,W),C=y4(I),w=$[P?D==="floating"?"reference":"floating":D],R=F7(await Y.getClippingRect({element:((Z=await(Y.isElement==null?void 0:Y.isElement(w)))!=null?Z:!0)?w:w.contextElement||await(Y.getDocumentElement==null?void 0:Y.getDocumentElement($.floating)),boundary:O,rootBoundary:B,strategy:V})),b=D==="floating"?{x:K,y:Q,width:X.floating.width,height:X.floating.height}:X.reference,f=await(Y.getOffsetParent==null?void 0:Y.getOffsetParent($.floating)),p=await(Y.isElement==null?void 0:Y.isElement(f))&&await(Y.getScale==null?void 0:Y.getScale(f))||{x:1,y:1},H=F7(Y.convertOffsetParentRelativeRectToViewportRelativeRect?await Y.convertOffsetParentRelativeRectToViewportRelativeRect({elements:$,rect:b,offsetParent:f,strategy:V}):b);return{top:(R.top-H.top+C.top)/p.y,bottom:(H.bottom-R.bottom+C.bottom)/p.y,left:(R.left-H.left+C.left)/p.x,right:(H.right-R.right+C.right)/p.x}}var aq=50,aY=async(W,J,Z)=>{let{placement:K="bottom",strategy:Q="absolute",middleware:Y=[],platform:X}=Z,$=X.detectOverflow?X:{...X,detectOverflow:sY},V=await(X.isRTL==null?void 0:X.isRTL(J)),O=await X.getElementRects({reference:W,floating:J,strategy:Q}),{x:B,y:D}=iY(O,K,V),P=K,I=0,C={};for(let M=0;M<Y.length;M++){let w=Y[M];if(!w)continue;let{name:R,fn:b}=w,{x:f,y:p,data:H,reset:n}=await b({x:B,y:D,initialPlacement:K,placement:P,strategy:Q,middlewareData:C,rects:O,platform:$,elements:{reference:W,floating:J}});if(B=f!=null?f:B,D=p!=null?p:D,C[R]={...C[R],...H},n&&I<aq){if(I++,typeof n==="object"){if(n.placement)P=n.placement;if(n.rects)O=n.rects===!0?await X.getElementRects({reference:W,floating:J,strategy:Q}):n.rects;({x:B,y:D}=iY(O,P,V))}M=-1}}return{x:B,y:D,placement:P,strategy:Q,middlewareData:C}},oY=(W)=>({name:"arrow",options:W,async fn(J){let{x:Z,y:K,placement:Q,rects:Y,platform:X,elements:$,middlewareData:V}=J,{element:O,padding:B=0}=z7(W,J)||{};if(O==null)return{};let D=y4(B),P={x:Z,y:K},I=i9(Q),C=d9(I),M=await X.getDimensions(O),w=I==="y",R=w?"top":"left",b=w?"bottom":"right",f=w?"clientHeight":"clientWidth",p=Y.reference[C]+Y.reference[I]-P[I]-Y.floating[C],H=P[I]-Y.reference[I],n=await(X.getOffsetParent==null?void 0:X.getOffsetParent(O)),J0=n?n[f]:0;if(!J0||!await(X.isElement==null?void 0:X.isElement(n)))J0=$.floating[f]||Y.floating[C];let F0=p/2-H/2,p0=J0/2-M[C]/2-1,Z0=_1(D[R],p0),T5=_1(D[b],p0),U5=J0-M[C]-T5,w1=J0/2-M[C]/2+F0,F1=h4(Z0,w1,U5),q7=!V.arrow&&V7(Q)!=null&&w1!==F1&&Y.reference[C]/2-(w1<Z0?Z0:T5)-M[C]/2<0,s1=q7?w1<Z0?w1-Z0:w1-U5:0;return{[I]:P[I]+s1,data:{[I]:F1,centerOffset:w1-F1-s1,...q7&&{alignmentOffset:s1}},reset:q7}}});var rY=function(W){if(W===void 0)W={};return{name:"flip",options:W,async fn(J){var Z,K;let{placement:Q,middlewareData:Y,rects:X,initialPlacement:$,platform:V,elements:O}=J,{mainAxis:B=!0,crossAxis:D=!0,fallbackPlacements:P,fallbackStrategy:I="bestFit",fallbackAxisSideDirection:C="none",flipAlignment:M=!0,...w}=z7(W,J);if((Z=Y.arrow)!=null&&Z.alignmentOffset)return{};let R=vJ(Q),b=k1($),f=vJ($)===$,p=await(V.isRTL==null?void 0:V.isRTL(O.floating)),H=P||(f||!M?[M5($)]:cY($)),n=C!=="none";if(!P&&n)H.push(...dY($,M,C,p));let J0=[$,...H],F0=await V.detectOverflow(J,w),p0=[],Z0=((K=Y.flip)==null?void 0:K.overflows)||[];if(B)p0.push(F0[R]);if(D){let F1=lY(Q,X,p);p0.push(F0[F1[0]],F0[F1[1]])}if(Z0=[...Z0,{placement:Q,overflows:p0}],!p0.every((F1)=>F1<=0)){var T5,U5;let F1=(((T5=Y.flip)==null?void 0:T5.index)||0)+1,q7=J0[F1];if(q7){if(!(D==="alignment"?b!==k1(q7):!1)||Z0.every((N1)=>k1(N1.placement)===b?N1.overflows[0]>0:!0))return{data:{index:F1,overflows:Z0},reset:{placement:q7}}}let s1=(U5=Z0.filter((G7)=>G7.overflows[0]<=0).sort((G7,N1)=>G7.overflows[1]-N1.overflows[1])[0])==null?void 0:U5.placement;if(!s1)switch(I){case"bestFit":{var w1;let G7=(w1=Z0.filter((N1)=>{if(n){let MJ=k1(N1.placement);return MJ===b||MJ==="y"}return!0}).map((N1)=>[N1.placement,N1.overflows.filter((MJ)=>MJ>0).reduce((MJ,pq)=>MJ+pq,0)]).sort((N1,MJ)=>N1[1]-MJ[1])[0])==null?void 0:w1[0];if(G7)s1=G7;break}case"initialPlacement":s1=$;break}if(Q!==s1)return{reset:{placement:s1}}}return{}}}};var oq=new Set(["left","top"]);async function rq(W,J){let{placement:Z,platform:K,elements:Q}=W,Y=await(K.isRTL==null?void 0:K.isRTL(Q.floating)),X=vJ(Z),$=V7(Z),V=k1(Z)==="y",O=oq.has(X)?-1:1,B=Y&&V?-1:1,D=z7(J,W),{mainAxis:P,crossAxis:I,alignmentAxis:C}=typeof D==="number"?{mainAxis:D,crossAxis:0,alignmentAxis:null}:{mainAxis:D.mainAxis||0,crossAxis:D.crossAxis||0,alignmentAxis:D.alignmentAxis};if($&&typeof C==="number")I=$==="end"?C*-1:C;return V?{x:I*B,y:P*O}:{x:P*O,y:I*B}}var tY=function(W){if(W===void 0)W=0;return{name:"offset",options:W,async fn(J){var Z,K;let{x:Q,y:Y,placement:X,middlewareData:$}=J,V=await rq(J,W);if(X===((Z=$.offset)==null?void 0:Z.placement)&&(K=$.arrow)!=null&&K.alignmentOffset)return{};return{x:Q+V.x,y:Y+V.y,data:{...V,placement:X}}}}},eY=function(W){if(W===void 0)W={};return{name:"shift",options:W,async fn(J){let{x:Z,y:K,placement:Q,platform:Y}=J,{mainAxis:X=!0,crossAxis:$=!1,limiter:V={fn:(b)=>{let{x:f,y:p}=b;return{x:f,y:p}}},...O}=z7(W,J),B={x:Z,y:K},D=await Y.detectOverflow(J,O),P=k1(Q),I=x4(P),C=B[I],M=B[P],w=(b,f)=>h4(f+D[b==="y"?"top":"left"],f,f-D[b==="y"?"bottom":"right"]);if(X)C=w(I,C);if($)M=w(P,M);let R=V.fn({...J,[I]:C,[P]:M});return{...R,data:{x:R.x-Z,y:R.y-K,enabled:{[I]:X,[P]:$}}}}}};var J2=function(W){if(W===void 0)W={};return{name:"size",options:W,async fn(J){let{placement:Z,rects:K,platform:Q,elements:Y}=J,{apply:X=()=>{},...$}=z7(W,J),V=await Q.detectOverflow(J,$),O=vJ(Z),B=V7(Z),D=k1(Z)==="y",{width:P,height:I}=K.floating,C,M;if(O==="top"||O==="bottom")C=O,M=B===(await(Q.isRTL==null?void 0:Q.isRTL(Y.floating))?"start":"end")?"left":"right";else M=O,C=B==="end"?"top":"bottom";let w=I-V.top-V.bottom,R=P-V.left-V.right,b=_1(I-V[C],w),f=_1(P-V[M],R),p=J.middlewareData.shift,H=!p,n=b,J0=f;if(p!=null&&p.enabled.x)J0=R;if(p!=null&&p.enabled.y)n=w;if(H&&!B)if(D)J0=P-2*O1(V.left,V.right);else n=I-2*O1(V.top,V.bottom);await X({...J,availableWidth:J0,availableHeight:n});let F0=await Q.getDimensions(Y.floating);if(P!==F0.width||I!==F0.height)return{reset:{rects:!0}};return{}}}};function s9(){return typeof window!=="undefined"}function O7(W){if(Y2(W))return(W.nodeName||"").toLowerCase();return"#document"}function P0(W){var J;return(W==null||(J=W.ownerDocument)==null?void 0:J.defaultView)||window}function H1(W){var J;return(J=(Y2(W)?W.ownerDocument:W.document)||window.document)==null?void 0:J.documentElement}function Y2(W){if(!s9())return!1;return W instanceof Node||W instanceof P0(W).Node}function B1(W){if(!s9())return!1;return W instanceof Element||W instanceof P0(W).Element}function a1(W){if(!s9())return!1;return W instanceof HTMLElement||W instanceof P0(W).HTMLElement}function Z2(W){if(!s9()||typeof ShadowRoot==="undefined")return!1;return W instanceof ShadowRoot||W instanceof P0(W).ShadowRoot}function E5(W){let{overflow:J,overflowX:Z,overflowY:K,display:Q}=A1(W);return/auto|scroll|overlay|hidden|clip/.test(J+K+Z)&&Q!=="inline"&&Q!=="contents"}function W2(W){return/^(table|td|th)$/.test(O7(W))}function w5(W){try{if(W.matches(":popover-open"))return!0}catch(J){}try{return W.matches(":modal")}catch(J){return!1}}var tq=/transform|translate|scale|rotate|perspective|filter/,eq=/paint|layout|strict|content/,N7=(W)=>!!W&&W!=="none",m4;function a9(W){let J=B1(W)?A1(W):W;return N7(J.transform)||N7(J.translate)||N7(J.scale)||N7(J.rotate)||N7(J.perspective)||!o9()&&(N7(J.backdropFilter)||N7(J.filter))||tq.test(J.willChange||"")||eq.test(J.contain||"")}function K2(W){let J=kJ(W);while(a1(J)&&!b8(J)){if(a9(J))return J;else if(w5(J))return null;J=kJ(J)}return null}function o9(){if(m4==null)m4=typeof CSS!=="undefined"&&CSS.supports&&CSS.supports("-webkit-backdrop-filter","none");return m4}function b8(W){return/^(html|body|#document)$/.test(O7(W))}function A1(W){return P0(W).getComputedStyle(W)}function b5(W){if(B1(W))return{scrollLeft:W.scrollLeft,scrollTop:W.scrollTop};return{scrollLeft:W.scrollX,scrollTop:W.scrollY}}function kJ(W){if(O7(W)==="html")return W;let J=W.assignedSlot||W.parentNode||Z2(W)&&W.host||H1(W);return Z2(J)?J.host:J}function Q2(W){let J=kJ(W);if(b8(J))return(W.ownerDocument||W).body;if(a1(J)&&E5(J))return J;return Q2(J)}function w8(W,J,Z){var K;if(J===void 0)J=[];if(Z===void 0)Z=!0;let Q=Q2(W),Y=Q===((K=W.ownerDocument)==null?void 0:K.body),X=P0(Q);if(Y){let $=r9(X);return J.concat(X,X.visualViewport||[],E5(Q)?Q:[],$&&Z?w8($):[])}else return J.concat(Q,w8(Q,[],Z))}function r9(W){return W.parent&&Object.getPrototypeOf(W.parent)?W.frameElement:null}function q2(W){let J=A1(W),Z=parseFloat(J.width)||0,K=parseFloat(J.height)||0,Q=a1(W),Y=Q?W.offsetWidth:Z,X=Q?W.offsetHeight:K,$=S5(Z)!==Y||S5(K)!==X;if($)Z=Y,K=X;return{width:Z,height:K,$}}function g4(W){return!B1(W)?W.contextElement:W}function f8(W){let J=g4(W);if(!a1(J))return v1(1);let Z=J.getBoundingClientRect(),{width:K,height:Q,$:Y}=q2(J),X=(Y?S5(Z.width):Z.width)/K,$=(Y?S5(Z.height):Z.height)/Q;if(!X||!Number.isFinite(X))X=1;if(!$||!Number.isFinite($))$=1;return{x:X,y:$}}var JG=v1(0);function G2(W){let J=P0(W);if(!o9()||!J.visualViewport)return JG;return{x:J.visualViewport.offsetLeft,y:J.visualViewport.offsetTop}}function ZG(W,J,Z){if(J===void 0)J=!1;return!!Z&&J&&Z===P0(W)}function B7(W,J,Z,K){if(J===void 0)J=!1;if(Z===void 0)Z=!1;let Q=W.getBoundingClientRect(),Y=g4(W),X=v1(1);if(J)if(K){if(B1(K))X=f8(K)}else X=f8(W);let $=ZG(Y,Z,K)?G2(Y):v1(0),V=(Q.left+$.x)/X.x,O=(Q.top+$.y)/X.y,B=Q.width/X.x,D=Q.height/X.y;if(Y&&K){let P=P0(Y),I=B1(K)?P0(K):K,C=P,M=r9(C);while(M&&I!==C){let w=f8(M),R=M.getBoundingClientRect(),b=A1(M),f=R.left+(M.clientLeft+parseFloat(b.paddingLeft))*w.x,p=R.top+(M.clientTop+parseFloat(b.paddingTop))*w.y;V*=w.x,O*=w.y,B*=w.x,D*=w.y,V+=f,O+=p,C=P0(M),M=r9(C)}}return F7({width:B,height:D,x:V,y:O})}function t9(W,J){let Z=b5(W).scrollLeft;if(!J)return B7(H1(W)).left+Z;return J.left+Z}function z2(W,J){let Z=W.getBoundingClientRect(),K=Z.left+J.scrollLeft-t9(W,Z),Q=Z.top+J.scrollTop;return{x:K,y:Q}}function YG(W){let{elements:J,rect:Z,offsetParent:K,strategy:Q}=W,Y=Q==="fixed",X=H1(K),$=J?w5(J.floating):!1;if(K===X||$&&Y)return Z;let V={scrollLeft:0,scrollTop:0},O=v1(1),B=v1(0),D=a1(K);if(D||!Y){if(O7(K)!=="body"||E5(X))V=b5(K);if(D){let I=B7(K);O=f8(K),B.x=I.x+K.clientLeft,B.y=I.y+K.clientTop}}let P=X&&!D&&!Y?z2(X,V):v1(0);return{width:Z.width*O.x,height:Z.height*O.y,x:Z.x*O.x-V.scrollLeft*O.x+B.x+P.x,y:Z.y*O.y-V.scrollTop*O.y+B.y+P.y}}function WG(W){return W.getClientRects?Array.from(W.getClientRects()):[]}function KG(W){let J=b5(W),Z=W.ownerDocument.body,K=O1(W.scrollWidth,W.clientWidth,Z.scrollWidth,Z.clientWidth),Q=O1(W.scrollHeight,W.clientHeight,Z.scrollHeight,Z.clientHeight),Y=-J.scrollLeft+t9(W),X=-J.scrollTop;if(A1(Z).direction==="rtl")Y+=O1(W.clientWidth,Z.clientWidth)-K;return{width:K,height:Q,x:Y,y:X}}var QG=25;function XG(W,J,Z){if(Z===void 0)Z="viewport";let K=Z==="layoutViewport",Q=P0(W),Y=H1(W),X=Q.visualViewport,$=Y.clientWidth,V=Y.clientHeight,O=0,B=0;if(X){let P=!o9()||J==="fixed";if(K){if(!P)O=-X.offsetLeft,B=-X.offsetTop}else if($=X.width,V=X.height,P)O=X.offsetLeft,B=X.offsetTop}if(t9(Y)<=0){let P=Y.ownerDocument,I=P.body,C=getComputedStyle(I),M=P.compatMode==="CSS1Compat"?parseFloat(C.marginLeft)+parseFloat(C.marginRight)||0:0,w=Math.abs(Y.clientWidth-I.clientWidth-M),R=getComputedStyle(Y).scrollbarGutter==="stable both-edges"?w/2:w;if(R<=QG)$-=R}return{width:$,height:V,x:O,y:B}}function $G(W,J){let Z=B7(W,!0,J==="fixed"),K=Z.top+W.clientTop,Q=Z.left+W.clientLeft,Y=f8(W),X=W.clientWidth*Y.x,$=W.clientHeight*Y.y,V=Q*Y.x,O=K*Y.y;return{width:X,height:$,x:V,y:O}}function X2(W,J,Z){let K;if(J==="viewport"||J==="layoutViewport")K=XG(W,Z,J);else if(J==="document")K=KG(H1(W));else if(B1(J))K=$G(J,Z);else{let Q=G2(W);K={x:J.x-Q.x,y:J.y-Q.y,width:J.width,height:J.height}}return F7(K)}function qG(W,J){let Z=J.get(W);if(Z)return Z;let K=w8(W,[],!1).filter(($)=>B1($)&&O7($)!=="body"),Q=null,Y=A1(W).position==="fixed",X=Y?kJ(W):W;while(B1(X)&&!b8(X)){let $=A1(X),V=a9(X),O=Q?Q.position:Y?"fixed":"";if(!V&&(O==="fixed"||O==="absolute"&&$.position==="static"))K=K.filter((D)=>D!==X);else Q=$;X=kJ(X)}return J.set(W,K),K}function GG(W){let{element:J,boundary:Z,rootBoundary:K,strategy:Q}=W,X=[...Z==="clippingAncestors"?w5(J)?[]:qG(J,this._c):[].concat(Z),K],$=X2(J,X[0],Q),V=$.top,O=$.right,B=$.bottom,D=$.left;for(let P=1;P<X.length;P++){let I=X2(J,X[P],Q);V=O1(I.top,V),O=_1(I.right,O),B=_1(I.bottom,B),D=O1(I.left,D)}return{width:O-D,height:B-V,x:D,y:V}}function zG(W){let{width:J,height:Z}=q2(W);return{width:J,height:Z}}function VG(W,J,Z){let K=a1(J),Q=H1(J),Y=Z==="fixed",X=B7(W,!0,Y,J),$={scrollLeft:0,scrollTop:0},V=v1(0);if(K||!Y){if(O7(J)!=="body"||E5(Q))$=b5(J);if(K){let P=B7(J,!0,Y,J);V.x=P.x+J.clientLeft,V.y=P.y+J.clientTop}}if(!K&&Q)V.x=t9(Q);let O=Q&&!K&&!Y?z2(Q,$):v1(0),B=X.left+$.scrollLeft-V.x-O.x,D=X.top+$.scrollTop-V.y-O.y;return{x:B,y:D,width:X.width,height:X.height}}function p4(W){return A1(W).position==="static"}function $2(W,J){if(!a1(W)||A1(W).position==="fixed")return null;if(J)return J(W);let Z=W.offsetParent;if(H1(W)===Z)Z=Z.ownerDocument.body;return Z}function V2(W,J){let Z=P0(W);if(w5(W))return Z;if(!a1(W)){let Q=kJ(W);while(Q&&!b8(Q)){if(B1(Q)&&!p4(Q))return Q;Q=kJ(Q)}return Z}let K=$2(W,J);while(K&&W2(K)&&p4(K))K=$2(K,J);if(K&&b8(K)&&p4(K)&&!a9(K))return Z;return K||K2(W)||Z}var FG=async function(W){let J=this.getOffsetParent||V2,Z=this.getDimensions,K=await Z(W.floating);return{reference:VG(W.reference,await J(W.floating),W.strategy),floating:{x:0,y:0,width:K.width,height:K.height}}};function NG(W){return A1(W).direction==="rtl"}var OG={convertOffsetParentRelativeRectToViewportRelativeRect:YG,getDocumentElement:H1,getClippingRect:GG,getOffsetParent:V2,getElementRects:FG,getClientRects:WG,getDimensions:zG,getScale:f8,isElement:B1,isRTL:NG};function F2(W,J){return W.x===J.x&&W.y===J.y&&W.width===J.width&&W.height===J.height}function BG(W,J,Z){let K=null,Q,Y=H1(W);function X(){var B;clearTimeout(Q),(B=K)==null||B.disconnect(),K=null}function $(B,D){if(B===void 0)B=!1;if(D===void 0)D=1;X();let P=W.getBoundingClientRect(),{left:I,top:C,width:M,height:w}=P;if(!B)J();if(!M||!w)return;let R=R5(C),b=R5(Y.clientWidth-(I+M)),f=R5(Y.clientHeight-(C+w)),p=R5(I),n={rootMargin:-R+"px "+-b+"px "+-f+"px "+-p+"px",threshold:O1(0,_1(1,D))||1},J0=!0;function F0(p0){let Z0=p0[0].intersectionRatio;if(!F2(P,W.getBoundingClientRect()))return $();if(Z0!==D){if(!J0)return $();if(!Z0)Q=setTimeout(()=>{$(!1,0.0000001)},1000);else $(!1,Z0)}J0=!1}try{K=new IntersectionObserver(F0,{...n,root:Y.ownerDocument})}catch(p0){K=new IntersectionObserver(F0,n)}K.observe(W)}let V=P0(W),O=()=>$(Z);return V.addEventListener("resize",O),$(!0),()=>{V.removeEventListener("resize",O),X()}}function N2(W,J,Z,K){if(K===void 0)K={};let{ancestorScroll:Q=!0,ancestorResize:Y=!0,elementResize:X=typeof ResizeObserver==="function",layoutShift:$=typeof IntersectionObserver==="function",animationFrame:V=!1}=K,O=g4(W),B=Q||Y?[...O?w8(O):[],...J?w8(J):[]]:[];B.forEach((R)=>{Q&&R.addEventListener("scroll",Z),Y&&R.addEventListener("resize",Z)});let D=O&&$?BG(O,Z,Y):null,P=-1,I=null;if(X){if(I=new ResizeObserver((R)=>{let[b]=R;if(b&&b.target===O&&I&&J)I.unobserve(J),cancelAnimationFrame(P),P=requestAnimationFrame(()=>{var f;(f=I)==null||f.observe(J)});Z()}),O&&!V)I.observe(O);if(J)I.observe(J)}let C,M=V?B7(W):null;if(V)w();function w(){let R=B7(W);if(M&&!F2(M,R))Z();M=R,C=requestAnimationFrame(w)}return Z(),()=>{var R;if(B.forEach((b)=>{Q&&b.removeEventListener("scroll",Z),Y&&b.removeEventListener("resize",Z)}),D==null||D(),(R=I)==null||R.disconnect(),I=null,V)cancelAnimationFrame(C)}}var O2=tY;var B2=eY,A2=rY,D2=J2;var P2=oY;var I2=(W,J,Z)=>{let K=new Map,Q=Z!=null?Z:{},Y={...OG,...Q.platform,_c:K};return aY(W,J,{...Q,platform:Y})};class n4{constructor(W,J){this.placement="bottom-start",this.update=()=>{let Z=this.options.anchor(),K=this.options.floating();if(!Z||!K)return;let Q=this.options.arrow?.(),Y=typeof this.options.offset==="function"?this.options.offset():this.options.offset,X=typeof this.options.placement==="function"?this.options.placement():this.options.placement,$=[O2(Y??0)];if(this.options.flip!==!1)$.push(A2());if(this.options.shift!==!1){let V=this.options.within?.();$.push(B2({padding:8,...V?{boundary:V}:{}}))}if(this.options.resize!==!1)$.push(D2({apply:({availableHeight:V,elements:O,rects:B})=>{O.floating.style.setProperty("--floating-available-height",`${Math.round(V)}px`),O.floating.style.setProperty("--floating-anchor-width",`${Math.round(B.reference.width)}px`)},padding:8}));if(Q)$.push(P2({element:Q}));I2(Z,K,{middleware:$,placement:X??"bottom-start",strategy:"fixed"}).then(({middlewareData:V,placement:O,x:B,y:D})=>{this.placement=O,Object.assign(K.style,{insetBlockStart:"0",insetInlineStart:"0",position:"fixed",translate:`${Math.round(B)}px ${Math.round(D)}px`}),K.setAttribute("data-placement",O),K.setAttribute("data-placed","");let P=V.arrow;if(Q&&P)Object.assign(Q.style,{insetBlockStart:P.y===void 0?"":`${P.y}px`,insetInlineStart:P.x===void 0?"":`${P.x}px`}),K.style.setProperty("--floating-arrow-x",P.x===void 0?"":`${Math.round(P.x+Q.offsetWidth/2)}px`),K.style.setProperty("--floating-arrow-y",P.y===void 0?"":`${Math.round(P.y+Q.offsetHeight/2)}px`)})},this.options=J,W.addController(this)}start(){let W=this.options.anchor(),J=this.options.floating();if(!W||!J||this.cleanup)return;this.cleanup=N2(W,J,this.update)}stop(){this.cleanup?.(),this.cleanup=void 0,this.options.floating()?.removeAttribute("data-placed")}hostDisconnected(){this.stop()}}class u1{constructor(W,J){this.host=W,this.options=J,W.addController(this)}hostConnected(){this.resize=new ResizeObserver(()=>this.place()),this.resize.observe(this.host)}hostDisconnected(){this.resize?.disconnect(),this.resize=void 0,this.stopWaiting()}hostUpdated(){this.place()}place(){let W=this.options.indicator(),J=this.options.surface(),Z=this.options.active();if(!W||!J)return;if(!Z){W.removeAttribute("data-placed");return}let K=Z.getBoundingClientRect(),Q=J.getBoundingClientRect();if(K.width===0&&K.height===0)return;let Y=getComputedStyle(J).direction==="rtl",X=Y?Q.right-K.right-J.clientLeft:K.left-Q.left-J.clientLeft,$=`${Y?-X:X}px`,V=`${K.top-Q.top-J.clientTop}px`,O=this.last!==void 0&&(this.last.x!==$||this.last.y!==V);if(this.last={x:$,y:V},W.style.setProperty("--indicator-x",$),W.style.setProperty("--indicator-y",V),W.style.setProperty("--indicator-width",`${K.width}px`),W.style.setProperty("--indicator-height",`${K.height}px`),W.toggleAttribute("data-placed",!0),!O)return;W.toggleAttribute("data-moving",!0),this.stopWaiting();let B=(D)=>{if(D&&D.propertyName!=="translate")return;W.removeAttribute("data-moving"),this.stopWaiting()};W.addEventListener("transitionend",B),this.waiting={on:W,settle:B},this.settling=setTimeout(B,1000)}stopWaiting(){if(clearTimeout(this.settling),this.settling=void 0,this.waiting)this.waiting.on.removeEventListener("transitionend",this.waiting.settle),this.waiting=void 0}}var AG=new Set(["ArrowDown","ArrowLeft","ArrowRight","ArrowUp","End","Home"]);class b0{constructor(W,{items:J,origin:Z="selection",reserved:K=()=>[],selects:Q=()=>!0,wrap:Y=!0}){this.handleKeydown=(X)=>{if(!AG.has(X.key)||this.reserved().includes(X.key))return;let $=this.items().filter((P)=>!P.disabled);if($.length===0)return;let V=this.origin==="focus"?$.findIndex((P)=>P.contains(X.target)):$.findIndex((P)=>P.selected);if(this.origin==="focus"&&V===-1)return;let O=$.length-1,B=V;if(X.key==="ArrowRight"||X.key==="ArrowDown")B=this.wrap?(V+1)%$.length:Math.min(V+1,O);else if(X.key==="ArrowLeft"||X.key==="ArrowUp")B=V<0?O:this.wrap?(V-1+$.length)%$.length:Math.max(V-1,0);else if(X.key==="Home")B=0;else B=O;X.preventDefault();let D=$[B];if(D?.focusItem(),this.selects())D?.select()},this.host=W,this.items=J,this.origin=Z,this.reserved=K,this.selects=Q,this.wrap=Y,W.addController(this)}hostConnected(){this.host.addEventListener("keydown",this.handleKeydown)}hostDisconnected(){this.host.removeEventListener("keydown",this.handleKeydown)}}class d{constructor(W,J){this.shown=!1,this.options=J,this.floating=new n4(W,{anchor:J.anchor,...J.arrow===void 0?{}:{arrow:J.arrow},floating:J.surface,...J.offset===void 0?{}:{offset:J.offset},...J.placement===void 0?{}:{placement:J.placement},...J.within===void 0?{}:{within:J.within}}),this.dismisser=new u4(W,{boundary:J.boundary??J.surface,onDismiss:J.onDismiss}),W.addController(this)}get open(){return this.shown}get places(){let W=this.options.place;if(W===void 0)return!0;return typeof W==="function"?W():W}show(){let W=this.options.surface();if(this.shown||!W)return;if(this.shown=!0,typeof W.showPopover==="function"){if(!W.hasAttribute("popover"))throw new Error("PopoverController: the surface needs a `popover` attribute to reach the top layer");W.showPopover()}if(this.places)this.floating.start();this.dismisser.activate()}hide(){let W=this.options.surface();if(!this.shown)return;this.shown=!1,this.dismisser.deactivate(),this.floating.stop(),W?.hidePopover?.()}toggle(){if(this.shown)this.hide();else this.show()}reposition(){this.floating.update()}hostDisconnected(){this.shown=!1}}var U2=(W)=>W.getAttribute("role")==="table"||W.getAttribute("role")==="grid"||/^helix-(headless-)?table$/i.test(W.tagName),DG=(W)=>{let J=[...W.querySelectorAll('helix-table-column, helix-headless-table-column, [role="columnheader"]')],Z=[...W.querySelectorAll('helix-table-row, helix-headless-table-row, [role="row"]')],K=J.slice(1).map((X)=>X.textContent?.trim()??""),Q=(X)=>[...X.querySelectorAll('helix-table-cell, helix-headless-table-cell, [role="cell"], [role="gridcell"], [role="rowheader"]')],Y=Math.max(0,...Z.map((X)=>Q(X).length-1));return Array.from({length:Y},(X,$)=>({name:K[$]??W.getAttribute("label")??"",points:Z.flatMap((V)=>{let O=Q(V),B=O[0],D=O[$+1];if(!D)return[];let P=D.dataset?.value??D.textContent??"",I=Number(P.trim()),C=B?.querySelector("time")?.getAttribute("datetime"),M=D.dataset?.tone;return Number.isFinite(I)&&P.trim()!==""?[{label:B?.textContent?.trim()??"",value:I,...M?{tone:M}:{},...C?{when:C}:{}}]:[]})}))},T2=(W)=>W.filter((J)=>J.points.length>0),e9=(W)=>{if(U2(W))return T2(DG(W));let J=W,Z=[...J.tHead?.rows[0]?.cells??[]].slice(1).map((Y)=>Y.textContent?.trim()??""),K=[...J.tBodies[0]?.rows??[]],Q=Math.max(0,...K.map((Y)=>Y.cells.length-1));return T2(Array.from({length:Q},(Y,X)=>({name:Z[X]??J.caption?.textContent?.trim()??"",points:K.flatMap(($)=>{let V=$.cells[0],O=$.cells[X+1];if(!O)return[];let B=O.dataset.value??O.textContent??"",D=Number(B.trim()),P=V?.querySelector("time")?.getAttribute("datetime"),I=O.dataset.tone;return Number.isFinite(D)&&B.trim()!==""?[{label:V?.textContent?.trim()??"",value:D,...I?{tone:I}:{},...P?{when:P}:{}}]:[]})})))},C2=(W)=>{let J=(Y,X)=>{if(!X)return;let $=X.textContent?.trim()??"",V=X.dataset?.value??$,O=Number(V.trim());return{name:Y,text:$,...Number.isFinite(O)&&V.trim()!==""?{value:O}:{}}},Z=(Y,X,$)=>{let V=Y?.querySelector("time")?.getAttribute("datetime");return{cells:X.map((O,B)=>J($[B]??"",O)).filter((O)=>O!==void 0),label:Y?.textContent?.trim()??"",...V?{when:V}:{}}};if(U2(W)){let Y=[...W.querySelectorAll('helix-table-column, helix-headless-table-column, [role="columnheader"]')].slice(1).map((X)=>X.textContent?.trim()??"");return[...W.querySelectorAll('helix-table-row, helix-headless-table-row, [role="row"]')].map((X)=>{let $=[...X.querySelectorAll('helix-table-cell, helix-headless-table-cell, [role="cell"], [role="gridcell"], [role="rowheader"]')];return Z($[0],$.slice(1),Y)})}let K=W,Q=[...K.tHead?.rows[0]?.cells??[]].slice(1).map((Y)=>Y.textContent?.trim()??"");return[...K.tBodies[0]?.rows??[]].map((Y)=>Z(Y.cells[0],[...Y.cells].slice(1),Q))};class HJ{#J;#Z;constructor(W){this.#J=W,W.addController(this)}get element(){let W=this.#J;if(W.for==="")return null;let Z=W.getRootNode().getElementById?.(W.for);if(!Z)return null;let K=Z.getAttribute("role");return Z.tagName==="TABLE"||K==="table"||K==="grid"||/^helix-(headless-)?table$/i.test(Z.tagName)?Z:null}get series(){let W=this.element;return W?e9(W):[]}hostConnected(){this.watch()}hostDisconnected(){this.#Z?.disconnect(),this.#Z=void 0}watch(){this.#Z?.disconnect();let W=this.element;if(!W||typeof MutationObserver==="undefined")return;this.#Z??=new MutationObserver(()=>{this.#J.requestUpdate()}),this.#Z.observe(W,{characterData:!0,childList:!0,subtree:!0})}}class J6{constructor(W,J){this.host=W,this.onChange=J,this.context=null,this.announce=()=>{this.host.requestUpdate(),this.onChange?.()},W.addController(this)}hostConnected(){if(typeof document==="undefined")return;this.probe=document.createElement("span"),this.probe.style.display="none",document.body.appendChild(this.probe);let W=document.createElement("canvas");W.width=1,W.height=1,this.context=W.getContext("2d",{willReadFrequently:!0}),this.modes=new MutationObserver(()=>this.announce()),this.modes.observe(document.documentElement,{attributeFilter:["data-color-mode"],attributes:!0}),this.scheme=window.matchMedia("(prefers-color-scheme: light)"),this.scheme.addEventListener("change",this.announce)}hostDisconnected(){this.modes?.disconnect(),this.modes=void 0,this.scheme?.removeEventListener("change",this.announce),this.scheme=void 0,this.probe?.remove(),this.probe=void 0,this.context=null}read(W,J){let{context:Z,probe:K}=this;if(!Z||!K)return[...J];K.style.color=`var(${W})`,Z.fillStyle="#000000",Z.fillStyle=getComputedStyle(K).color,Z.fillRect(0,0,1,1);let[Q,Y,X]=Z.getImageData(0,0,1,1).data;return[(Q??0)/255,(Y??0)/255,(X??0)/255]}}class Z6{constructor(W,J){this.watching=!1,this.settling=0,this.warned=!1,this.window={after:0,before:0,first:0,last:0},this.handleScroll=()=>{this.settling=0,this.measure()},this.host=W,this.options=J,W.addController(this)}hostConnected(){this.observer=new ResizeObserver(()=>{this.measure()})}hostDisconnected(){this.observer?.disconnect(),this.observer=void 0,this.watching=!1,this.options.container()?.removeEventListener("scroll",this.handleScroll)}watch(){if(this.watching)return;let W=this.options.container();if(!W||!this.observer)return;this.observer.observe(W),W.addEventListener("scroll",this.handleScroll,{passive:!0}),this.watching=!0}measure(){this.watch();let W=this.options.container(),J=Math.max(0,this.options.count()),Z=Math.max(1,this.options.estimate());if(!W)return;let K=this.options.overscan??4,Q=Math.max(0,Math.floor(W.scrollTop/Z)-K),Y=Math.ceil(W.clientHeight/Z)+K*2,X=Math.min(J,Q+Y),$={after:Math.max(0,(J-X)*Z),before:Q*Z,first:Q,last:X};if(this.last?.count!==J||this.last.estimate!==Z)this.last={count:J,estimate:Z},this.settling=0;if($.first===this.window.first&&$.last===this.window.last&&$.before===this.window.before&&$.after===this.window.after){this.settling=0;return}if(this.settling>=10){this.report();return}this.settling+=1,this.window=$,this.host.requestUpdate()}report(){if(this.warned)return;this.warned=!0,console.warn("VirtualizeController: the window did not settle in 10 passes, so it is holding the last one. That happens when the scrolling box has no height of its own: its `clientHeight` is then a function of the rows just drawn, so measuring moves what is being measured and the two never agree. Give the container a block size and an overflow, which is what the styled tier does and what a headless consumer has to.")}}var L2=new Map,l4=(W)=>{for(let[J,Z]of Object.entries(W))L2.set(J,new Set(Z))},c4=(W)=>L2.get(W);var Y6=globalThis,W6=Y6.ShadowRoot&&(Y6.ShadyCSS===void 0||Y6.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,d4=Symbol(),M2=new WeakMap;class K6{constructor(W,J,Z){if(this._$cssResult$=!0,Z!==d4)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=W,this.t=J}get styleSheet(){let W=this.o,J=this.t;if(W6&&W===void 0){let Z=J!==void 0&&J.length===1;Z&&(W=M2.get(J)),W===void 0&&((this.o=W=new CSSStyleSheet).replaceSync(this.cssText),Z&&M2.set(J,W))}return W}toString(){return this.cssText}}var Q6=(W)=>new K6(typeof W=="string"?W:W+"",void 0,d4),j8=(W,...J)=>{let Z=W.length===1?W[0]:J.reduce((K,Q,Y)=>K+((X)=>{if(X._$cssResult$===!0)return X.cssText;if(typeof X=="number")return X;throw Error("Value passed to 'css' function must be a 'css' function result: "+X+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(Q)+W[Y+1],W[0]);return new K6(Z,W,d4)},S2=(W,J)=>{if(W6)W.adoptedStyleSheets=J.map((Z)=>Z instanceof CSSStyleSheet?Z:Z.styleSheet);else for(let Z of J){let K=document.createElement("style"),Q=Y6.litNonce;Q!==void 0&&K.setAttribute("nonce",Q),K.textContent=Z.cssText,W.appendChild(K)}},i4=W6?(W)=>W:(W)=>W instanceof CSSStyleSheet?((J)=>{let Z="";for(let K of J.cssRules)Z+=K.cssText;return Q6(Z)})(W):W;var{is:PG,defineProperty:IG,getOwnPropertyDescriptor:TG,getOwnPropertyNames:UG,getOwnPropertySymbols:CG,getPrototypeOf:LG}=Object,X6=globalThis,R2=X6.trustedTypes,MG=R2?R2.emptyScript:"",SG=X6.reactiveElementPolyfillSupport,f5=(W,J)=>W,j5={toAttribute(W,J){switch(J){case Boolean:W=W?MG:null;break;case Object:case Array:W=W==null?W:JSON.stringify(W)}return W},fromAttribute(W,J){let Z=W;switch(J){case Boolean:Z=W!==null;break;case Number:Z=W===null?null:Number(W);break;case Object:case Array:try{Z=JSON.parse(W)}catch(K){Z=null}}return Z}},$6=(W,J)=>!PG(W,J),E2={attribute:!0,type:String,converter:j5,reflect:!1,useDefault:!1,hasChanged:$6};Symbol.metadata??=Symbol("metadata"),X6.litPropertyMetadata??=new WeakMap;class uJ extends HTMLElement{static addInitializer(W){this._$Ei(),(this.l??=[]).push(W)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(W,J=E2){if(J.state&&(J.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(W)&&((J=Object.create(J)).wrapped=!0),this.elementProperties.set(W,J),!J.noAccessor){let Z=Symbol(),K=this.getPropertyDescriptor(W,Z,J);K!==void 0&&IG(this.prototype,W,K)}}static getPropertyDescriptor(W,J,Z){let{get:K,set:Q}=TG(this.prototype,W)??{get(){return this[J]},set(Y){this[J]=Y}};return{get:K,set(Y){let X=K?.call(this);Q?.call(this,Y),this.requestUpdate(W,X,Z)},configurable:!0,enumerable:!0}}static getPropertyOptions(W){return this.elementProperties.get(W)??E2}static _$Ei(){if(this.hasOwnProperty(f5("elementProperties")))return;let W=LG(this);W.finalize(),W.l!==void 0&&(this.l=[...W.l]),this.elementProperties=new Map(W.elementProperties)}static finalize(){if(this.hasOwnProperty(f5("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(f5("properties"))){let J=this.properties,Z=[...UG(J),...CG(J)];for(let K of Z)this.createProperty(K,J[K])}let W=this[Symbol.metadata];if(W!==null){let J=litPropertyMetadata.get(W);if(J!==void 0)for(let[Z,K]of J)this.elementProperties.set(Z,K)}this._$Eh=new Map;for(let[J,Z]of this.elementProperties){let K=this._$Eu(J,Z);K!==void 0&&this._$Eh.set(K,J)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(W){let J=[];if(Array.isArray(W)){let Z=new Set(W.flat(1/0).reverse());for(let K of Z)J.unshift(i4(K))}else W!==void 0&&J.push(i4(W));return J}static _$Eu(W,J){let Z=J.attribute;return Z===!1?void 0:typeof Z=="string"?Z:typeof W=="string"?W.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise((W)=>this.enableUpdating=W),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach((W)=>W(this))}addController(W){(this._$EO??=new Set).add(W),this.renderRoot!==void 0&&this.isConnected&&W.hostConnected?.()}removeController(W){this._$EO?.delete(W)}_$E_(){let W=new Map,J=this.constructor.elementProperties;for(let Z of J.keys())this.hasOwnProperty(Z)&&(W.set(Z,this[Z]),delete this[Z]);W.size>0&&(this._$Ep=W)}createRenderRoot(){let W=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return S2(W,this.constructor.elementStyles),W}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach((W)=>W.hostConnected?.())}enableUpdating(W){}disconnectedCallback(){this._$EO?.forEach((W)=>W.hostDisconnected?.())}attributeChangedCallback(W,J,Z){this._$AK(W,Z)}_$ET(W,J){let Z=this.constructor.elementProperties.get(W),K=this.constructor._$Eu(W,Z);if(K!==void 0&&Z.reflect===!0){let Q=(Z.converter?.toAttribute!==void 0?Z.converter:j5).toAttribute(J,Z.type);this._$Em=W,Q==null?this.removeAttribute(K):this.setAttribute(K,Q),this._$Em=null}}_$AK(W,J){let Z=this.constructor,K=Z._$Eh.get(W);if(K!==void 0&&this._$Em!==K){let Q=Z.getPropertyOptions(K),Y=typeof Q.converter=="function"?{fromAttribute:Q.converter}:Q.converter?.fromAttribute!==void 0?Q.converter:j5;this._$Em=K;let X=Y.fromAttribute(J,Q.type);this[K]=X??this._$Ej?.get(K)??X,this._$Em=null}}requestUpdate(W,J,Z,K=!1,Q){if(W!==void 0){let Y=this.constructor;if(K===!1&&(Q=this[W]),Z??=Y.getPropertyOptions(W),!((Z.hasChanged??$6)(Q,J)||Z.useDefault&&Z.reflect&&Q===this._$Ej?.get(W)&&!this.hasAttribute(Y._$Eu(W,Z))))return;this.C(W,J,Z)}this.isUpdatePending===!1&&(this._$ES=this._$EP())}C(W,J,{useDefault:Z,reflect:K,wrapped:Q},Y){Z&&!(this._$Ej??=new Map).has(W)&&(this._$Ej.set(W,Y??J??this[W]),Q!==!0||Y!==void 0)||(this._$AL.has(W)||(this.hasUpdated||Z||(J=void 0),this._$AL.set(W,J)),K===!0&&this._$Em!==W&&(this._$Eq??=new Set).add(W))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(J){Promise.reject(J)}let W=this.scheduleUpdate();return W!=null&&await W,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(let[K,Q]of this._$Ep)this[K]=Q;this._$Ep=void 0}let Z=this.constructor.elementProperties;if(Z.size>0)for(let[K,Q]of Z){let{wrapped:Y}=Q,X=this[K];Y!==!0||this._$AL.has(K)||X===void 0||this.C(K,void 0,Q,X)}}let W=!1,J=this._$AL;try{W=this.shouldUpdate(J),W?(this.willUpdate(J),this._$EO?.forEach((Z)=>Z.hostUpdate?.()),this.update(J)):this._$EM()}catch(Z){throw W=!1,this._$EM(),Z}W&&this._$AE(J)}willUpdate(W){}_$AE(W){this._$EO?.forEach((J)=>J.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(W)),this.updated(W)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(W){return!0}update(W){this._$Eq&&=this._$Eq.forEach((J)=>this._$ET(J,this[J])),this._$EM()}updated(W){}firstUpdated(W){}}uJ.elementStyles=[],uJ.shadowRootOptions={mode:"open"},uJ[f5("elementProperties")]=new Map,uJ[f5("finalized")]=new Map,SG?.({ReactiveElement:uJ}),(X6.reactiveElementVersions??=[]).push("2.1.2");var s4=globalThis,w2=(W)=>W,q6=s4.trustedTypes,b2=q6?q6.createPolicy("lit-html",{createHTML:(W)=>W}):void 0;var o1=`lit$${Math.random().toFixed(9).slice(2)}$`,a4="?"+o1,RG=`<${a4}>`,P7=document,v5=()=>P7.createComment(""),k5=(W)=>W===null||typeof W!="object"&&typeof W!="function",o4=Array.isArray,H2=(W)=>o4(W)||typeof W?.[Symbol.iterator]=="function";var _5=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,f2=/-->/g,j2=/>/g,A7=RegExp(`>|[ \t
\f\r](?:([^\\s"'>=/]+)([ \t
\f\r]*=[ \t
\f\r]*(?:[^ \t
\f\r"'\`<>=]|("|')|))|$)`,"g"),_2=/'/g,v2=/"/g,u2=/^(?:script|style|textarea|title)$/i,r4=(W)=>(J,...Z)=>({_$litType$:W,strings:J,values:Z}),F=r4(1),_=r4(2),h2=r4(3),g0=Symbol.for("lit-noChange"),z=Symbol.for("lit-nothing"),k2=new WeakMap,D7=P7.createTreeWalker(P7,129);function x2(W,J){if(!o4(W)||!W.hasOwnProperty("raw"))throw Error("invalid template strings array");return b2!==void 0?b2.createHTML(J):J}var y2=(W,J)=>{let Z=W.length-1,K=[],Q,Y=J===2?"<svg>":J===3?"<math>":"",X=_5;for(let $=0;$<Z;$++){let V=W[$],O,B,D=-1,P=0;for(;P<V.length&&(X.lastIndex=P,B=X.exec(V),B!==null);)P=X.lastIndex,X===_5?B[1]==="!--"?X=f2:B[1]!==void 0?X=j2:B[2]!==void 0?(u2.test(B[2])&&(Q=RegExp("</"+B[2],"g")),X=A7):B[3]!==void 0&&(X=A7):X===A7?B[0]===">"?(X=Q??_5,D=-1):B[1]===void 0?D=-2:(D=X.lastIndex-B[2].length,O=B[1],X=B[3]===void 0?A7:B[3]==='"'?v2:_2):X===v2||X===_2?X=A7:X===f2||X===j2?X=_5:(X=A7,Q=void 0);let I=X===A7&&W[$+1].startsWith("/>")?" ":"";Y+=X===_5?V+RG:D>=0?(K.push(O),V.slice(0,D)+"$lit$"+V.slice(D)+o1+I):V+o1+(D===-2?$:I)}return[x2(W,Y+(W[Z]||"<?>")+(J===2?"</svg>":J===3?"</math>":"")),K]};class H5{constructor({strings:W,_$litType$:J},Z){let K;this.parts=[];let Q=0,Y=0,X=W.length-1,$=this.parts,[V,O]=y2(W,J);if(this.el=H5.createElement(V,Z),D7.currentNode=this.el.content,J===2||J===3){let B=this.el.content.firstChild;B.replaceWith(...B.childNodes)}for(;(K=D7.nextNode())!==null&&$.length<X;){if(K.nodeType===1){if(K.hasAttributes())for(let B of K.getAttributeNames())if(B.endsWith("$lit$")){let D=O[Y++],P=K.getAttribute(B).split(o1),I=/([.?@])?(.*)/.exec(D);$.push({type:1,index:Q,name:I[2],strings:P,ctor:I[1]==="."?e4:I[1]==="?"?JZ:I[1]==="@"?ZZ:v8}),K.removeAttribute(B)}else B.startsWith(o1)&&($.push({type:6,index:Q}),K.removeAttribute(B));if(u2.test(K.tagName)){let B=K.textContent.split(o1),D=B.length-1;if(D>0){K.textContent=q6?q6.emptyScript:"";for(let P=0;P<D;P++)K.append(B[P],v5()),D7.nextNode(),$.push({type:2,index:++Q});K.append(B[D],v5())}}}else if(K.nodeType===8)if(K.data===a4)$.push({type:2,index:Q});else{let B=-1;for(;(B=K.data.indexOf(o1,B+1))!==-1;)$.push({type:7,index:Q}),B+=o1.length-1}Q++}}static createElement(W,J){let Z=P7.createElement("template");return Z.innerHTML=W,Z}}function I7(W,J,Z=W,K){if(J===g0)return J;let Q=K!==void 0?Z._$Co?.[K]:Z._$Cl,Y=k5(J)?void 0:J._$litDirective$;return Q?.constructor!==Y&&(Q?._$AO?.(!1),Y===void 0?Q=void 0:(Q=new Y(W),Q._$AT(W,Z,K)),K!==void 0?(Z._$Co??=[])[K]=Q:Z._$Cl=Q),Q!==void 0&&(J=I7(W,Q._$AS(W,J.values),Q,K)),J}class t4{constructor(W,J){this._$AV=[],this._$AN=void 0,this._$AD=W,this._$AM=J}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(W){let{el:{content:J},parts:Z}=this._$AD,K=(W?.creationScope??P7).importNode(J,!0);D7.currentNode=K;let Q=D7.nextNode(),Y=0,X=0,$=Z[0];for(;$!==void 0;){if(Y===$.index){let V;$.type===2?V=new _8(Q,Q.nextSibling,this,W):$.type===1?V=new $.ctor(Q,$.name,$.strings,this,W):$.type===6&&(V=new YZ(Q,this,W)),this._$AV.push(V),$=Z[++X]}Y!==$?.index&&(Q=D7.nextNode(),Y++)}return D7.currentNode=P7,K}p(W){let J=0;for(let Z of this._$AV)Z!==void 0&&(Z.strings!==void 0?(Z._$AI(W,Z,J),J+=Z.strings.length-2):Z._$AI(W[J])),J++}}class _8{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(W,J,Z,K){this.type=2,this._$AH=z,this._$AN=void 0,this._$AA=W,this._$AB=J,this._$AM=Z,this.options=K,this._$Cv=K?.isConnected??!0}get parentNode(){let W=this._$AA.parentNode,J=this._$AM;return J!==void 0&&W?.nodeType===11&&(W=J.parentNode),W}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(W,J=this){W=I7(this,W,J),k5(W)?W===z||W==null||W===""?(this._$AH!==z&&this._$AR(),this._$AH=z):W!==this._$AH&&W!==g0&&this._(W):W._$litType$!==void 0?this.$(W):W.nodeType!==void 0?this.T(W):H2(W)?this.k(W):this._(W)}O(W){return this._$AA.parentNode.insertBefore(W,this._$AB)}T(W){this._$AH!==W&&(this._$AR(),this._$AH=this.O(W))}_(W){this._$AH!==z&&k5(this._$AH)?this._$AA.nextSibling.data=W:this.T(P7.createTextNode(W)),this._$AH=W}$(W){let{values:J,_$litType$:Z}=W,K=typeof Z=="number"?this._$AC(W):(Z.el===void 0&&(Z.el=H5.createElement(x2(Z.h,Z.h[0]),this.options)),Z);if(this._$AH?._$AD===K)this._$AH.p(J);else{let Q=new t4(K,this),Y=Q.u(this.options);Q.p(J),this.T(Y),this._$AH=Q}}_$AC(W){let J=k2.get(W.strings);return J===void 0&&k2.set(W.strings,J=new H5(W)),J}k(W){o4(this._$AH)||(this._$AH=[],this._$AR());let J=this._$AH,Z,K=0;for(let Q of W)K===J.length?J.push(Z=new _8(this.O(v5()),this.O(v5()),this,this.options)):Z=J[K],Z._$AI(Q),K++;K<J.length&&(this._$AR(Z&&Z._$AB.nextSibling,K),J.length=K)}_$AR(W=this._$AA.nextSibling,J){for(this._$AP?.(!1,!0,J);W!==this._$AB;){let Z=w2(W).nextSibling;w2(W).remove(),W=Z}}setConnected(W){this._$AM===void 0&&(this._$Cv=W,this._$AP?.(W))}}class v8{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(W,J,Z,K,Q){this.type=1,this._$AH=z,this._$AN=void 0,this.element=W,this.name=J,this._$AM=K,this.options=Q,Z.length>2||Z[0]!==""||Z[1]!==""?(this._$AH=Array(Z.length-1).fill(new String),this.strings=Z):this._$AH=z}_$AI(W,J=this,Z,K){let Q=this.strings,Y=!1;if(Q===void 0)W=I7(this,W,J,0),Y=!k5(W)||W!==this._$AH&&W!==g0,Y&&(this._$AH=W);else{let X=W,$,V;for(W=Q[0],$=0;$<Q.length-1;$++)V=I7(this,X[Z+$],J,$),V===g0&&(V=this._$AH[$]),Y||=!k5(V)||V!==this._$AH[$],V===z?W=z:W!==z&&(W+=(V??"")+Q[$+1]),this._$AH[$]=V}Y&&!K&&this.j(W)}j(W){W===z?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,W??"")}}class e4 extends v8{constructor(){super(...arguments),this.type=3}j(W){this.element[this.name]=W===z?void 0:W}}class JZ extends v8{constructor(){super(...arguments),this.type=4}j(W){this.element.toggleAttribute(this.name,!!W&&W!==z)}}class ZZ extends v8{constructor(W,J,Z,K,Q){super(W,J,Z,K,Q),this.type=5}_$AI(W,J=this){if((W=I7(this,W,J,0)??z)===g0)return;let Z=this._$AH,K=W===z&&Z!==z||W.capture!==Z.capture||W.once!==Z.once||W.passive!==Z.passive,Q=W!==z&&(Z===z||K);K&&this.element.removeEventListener(this.name,this,Z),Q&&this.element.addEventListener(this.name,this,W),this._$AH=W}handleEvent(W){typeof this._$AH=="function"?this._$AH.call(this.options?.host??this.element,W):this._$AH.handleEvent(W)}}class YZ{constructor(W,J,Z){this.element=W,this.type=6,this._$AN=void 0,this._$AM=J,this.options=Z}get _$AU(){return this._$AM._$AU}_$AI(W){I7(this,W)}}var m2={M:"$lit$",P:o1,A:a4,C:1,L:y2,R:t4,D:H2,V:I7,I:_8,H:v8,N:JZ,U:ZZ,B:e4,F:YZ},EG=s4.litHtmlPolyfillSupport;EG?.(H5,_8),(s4.litHtmlVersions??=[]).push("3.3.3");var p2=(W,J,Z)=>{let K=Z?.renderBefore??J,Q=K._$litPart$;if(Q===void 0){let Y=Z?.renderBefore??null;K._$litPart$=Q=new _8(J.insertBefore(v5(),Y),Y,void 0,Z??{})}return Q._$AI(W),Q};var WZ=globalThis;class hJ extends uJ{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){let W=super.createRenderRoot();return this.renderOptions.renderBefore??=W.firstChild,W}update(W){let J=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(W),this._$Do=p2(J,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return g0}}hJ._$litElement$=!0,hJ.finalized=!0,WZ.litElementHydrateSupport?.({LitElement:hJ});var wG=WZ.litElementPolyfillSupport;wG?.({LitElement:hJ});(WZ.litElementVersions??=[]).push("4.2.2");var KZ=Symbol.for(""),bG=(W)=>{if(W?.r===KZ)return W?._$litStatic$},n2=(W)=>({_$litStatic$:W,r:KZ}),f0=(W,...J)=>({_$litStatic$:J.reduce((Z,K,Q)=>Z+((Y)=>{if(Y._$litStatic$!==void 0)return Y._$litStatic$;throw Error(`Value passed to 'literal' function must be a 'literal' result: ${Y}. Use 'unsafeStatic' to pass non-literal values, but
            take care to ensure page security.`)})(K)+W[Q+1],W[0]),r:KZ}),g2=new Map,QZ=(W)=>(J,...Z)=>{let K=Z.length,Q,Y,X=[],$=[],V,O=0,B=!1;for(;O<K;){for(V=J[O];O<K&&(Y=Z[O],Q=bG(Y))!==void 0;)V+=Q+J[++O],B=!0;O!==K&&$.push(Y),X.push(V),O++}if(O===K&&X.push(J[K]),B){let D=X.join("$$lit$$");(J=g2.get(D))===void 0&&(X.raw=X,g2.set(D,J=X)),Z=$}return W(J,...Z)},T=QZ(F),xN=QZ(_),yN=QZ(h2);var fG=j8`
  *,
  ::before,
  ::after {
    box-sizing: border-box;
  }
`,jG=j8`
  :host([hidden]:not([hidden='until-found'])) {
    display: none;
  }
`,_G=j8`
  [data-scroller] {
    overflow: auto;
  }
`,vG=j8`
  :host(:not(:state(settled))),
  :host(:not(:state(settled))) * {
    transition: none !important;
  }
`,kG="__reactProps$",k8,XZ=(W)=>{let J=W;if(k8!==void 0&&J[k8]!==void 0)return J[k8];return k8=Object.keys(J).find((Z)=>Z.startsWith(kG)),k8===void 0?void 0:J[k8]},l2=new WeakSet,HG=new Set(["onActiveChange","onCheckedChange","onOpenChange","onValueChange"]),d2=(W,J)=>{if(l2.has(W))return;l2.add(W);let Z=W instanceof Element?`<${W.localName}>`:"A Helix element";for(let K of Object.keys(J)){if(K.startsWith("on:")){console.warn(`${Z} was given \`${K}\`, which is Solid's syntax. React binds the name after \`on\` verbatim, so this listens for an event called \`${K.slice(2)}\`. Write \`on${K.slice(3)}\`.`);continue}if(HG.has(K)){console.warn(`${Z} was given \`${K}\`, which was removed. It never worked from JSX, because React binds any \`on\` prop as an event of that name. Listen for the element's change event instead.`);continue}if(!K.startsWith("on")||!K.includes("-"))continue;let Q=K.slice(2);if(!yY.has(Q)){console.warn(`${Z} was given \`${K}\`, and nothing dispatches \`${Q}\`. TypeScript cannot check a hyphenated JSX prop, so this is the only place it shows up.`);continue}let Y=W instanceof Element?c4(W.localName):void 0;if(Y&&!Y.has(Q))console.warn(`${Z} was given \`${K}\`, but it dispatches ${[...Y].map((X)=>`\`${X}\``).join(", ")}. \`${Q}\` is sent by a different element, and React only wires an \`on\` prop on the element that dispatches, so this handler will never run. Put it on that element.`)}},uG=new Set(["scroll","scrollend"]),hG=(W)=>{if(W.type.includes("-"))return`on${W.type}`;if(W.bubbles||uG.has(W.type))return;return`on${W.type.charAt(0).toUpperCase()}${W.type.slice(1)}`},xG=(W,J)=>{let Z=XZ(W);if(Z===void 0)return;d2(W,Z);let K=hG(J),Q=K===void 0?void 0:Z[K];if(typeof Q==="function")W.addEventListener(J.type,Q)},c2=(W)=>{let J=XZ(W);if(J===void 0)return!1;let Z=W;for(let K of W.constructor.elementProperties.keys()){if(typeof K!=="string"||!Object.hasOwn(J,K))continue;let Q=J[K];if(Q===null||typeof Q!=="object"&&typeof Q!=="function")continue;if(Z[K]!==Q)Z[K]=Q}return!0};class A extends hJ{static{this.tier="helix-headless-"}tag(W){return n2(`${this.constructor.tier}${W}`)}toggleState(W,J){if("states"in this.internals)this.internals.states[J?"add":"delete"](W)}constructor(){super();this.resolveSettled=()=>{},this.stopInner=(W)=>{if(W.target!==this)W.stopPropagation()},this.internals=this.attachInternals(),this.whenSettled=new Promise((W)=>{this.resolveSettled=W})}dispatchEvent(W){return xG(this,W),super.dispatchEvent(W)}relayNativeEvent(W,J){this.dispatchEvent(new Event(W.type,{bubbles:W.bubbles,cancelable:W.cancelable,composed:W.composed,...J}))}static finalizeStyles(W){return[fG,jG,_G,vG,...hJ.finalizeStyles(W)]}firstUpdated(W){super.firstUpdated(W);let J=c2(this);requestAnimationFrame(()=>{this.toggleState("settled",!0),this.resolveSettled();let Z=XZ(this);if(Z!==void 0){if(!J)c2(this);d2(this,Z)}})}}var yG={attribute:!0,type:String,converter:j5,reflect:!1,hasChanged:$6},mG=(W=yG,J,Z)=>{let{kind:K,metadata:Q}=Z,Y=globalThis.litPropertyMetadata.get(Q);if(Y===void 0&&globalThis.litPropertyMetadata.set(Q,Y=new Map),K==="setter"&&((W=Object.create(W)).wrapped=!0),Y.set(Z.name,W),K==="accessor"){let{name:X}=Z;return{set($){let V=J.get.call(this);J.set.call(this,$),this.requestUpdate(X,V,W,!0,$)},init($){return $!==void 0&&this.C(X,void 0,W,$),$}}}if(K==="setter"){let{name:X}=Z;return function($){let V=this[X];J.call(this,$),this.requestUpdate(X,V,W,!0,$)}}throw Error("Unsupported decorator location: "+K)};function q(W){return(J,Z)=>typeof Z=="object"?mG(W,J,Z):((K,Q,Y)=>{let X=Q.hasOwnProperty(Y);return Q.constructor.createProperty(Y,K),X?Object.getOwnPropertyDescriptor(Q,Y):void 0})(W,J,Z)}function U(W){return q({...W,state:!0,attribute:!1})}var H8=(W,J,Z)=>(Z.configurable=!0,Z.enumerable=!0,Reflect.decorate&&typeof J!="object"&&Object.defineProperty(W,J,Z),Z);function i2(W){return(J,Z)=>{let{slot:K,selector:Q}=W??{},Y="slot"+(K?`[name=${K}]`:":not([name])");return H8(J,Z,{get(){let X=this.renderRoot?.querySelector(Y),$=X?.assignedElements(W)??[];return Q===void 0?$:$.filter((V)=>V.matches(Q))}})}}var $Z=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y};class E extends A{constructor(){super(...arguments);this.disabled=!1,this.formDisabled=!1,this.name=""}static{this.formAssociated=!0}get isDisabled(){return this.disabled||this.formDisabled}formDisabledCallback(W){this.formDisabled=W&&!this.disabled}willUpdate(W){super.willUpdate(W),this.internals.ariaDisabled=this.isDisabled?"true":null}get form(){return this.internals.form}get labels(){return this.internals.labels}}$Z([q({reflect:!0,type:Boolean})],E.prototype,"disabled",void 0);$Z([U()],E.prototype,"formDisabled",void 0);$Z([q({converter:{fromAttribute:(W)=>W??"",toAttribute:(W)=>W===""?null:W},reflect:!0})],E.prototype,"name",void 0);var s2=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},a2=24,c=(W)=>W%a2+1,r1=(W)=>{class J extends W{constructor(){super(...arguments);this.source=new HJ(this),this.pointer=new k4(this),this.for="",this.label=""}willUpdate(Z){if(super.willUpdate(Z),Z.has("for"))this.source.watch()}get series(){let Z=this.source.element;return Z?e9(Z):[]}get named(){return this.label||this.source.element?.querySelector("caption")?.textContent?.trim()||""}get sourceRows(){let Z=this.source.element;return Z?C2(Z):[]}get readings(){return this.sourceRows.length}}return s2([q()],J.prototype,"for",void 0),s2([q()],J.prototype,"label",void 0),J};var u5=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},z0=(W)=>{class J extends W{constructor(){super(...arguments);this.loading=!1,this.loadingText="Loading",this.emptyText="Nothing to show",this.slotCounted=!1,this.slotRows=0}countRows(Z){this.slotCounted=!0,this.slotRows=Z.target.assignedElements().length}get hasRows(){return this.slotCounted?this.slotRows>0:!0}updated(Z){super.updated?.(Z);let K=this.renderRoot?.querySelector?.("slot:not([name])");if(!K)return;let Q=K.assignedElements().length;if(this.slotCounted=!0,Q!==this.slotRows)this.slotRows=Q}renderStatus(Z){if(this.loading)return F`<p part="loading" role="status">${this.loadingText}</p>`;if(Z)return z;return F`<p part="empty">${this.emptyText}</p>`}}return u5([q({reflect:!0,type:Boolean})],J.prototype,"loading",void 0),u5([q({attribute:"loading-text"})],J.prototype,"loadingText",void 0),u5([q({attribute:"empty-text"})],J.prototype,"emptyText",void 0),u5([U()],J.prototype,"slotCounted",void 0),u5([U()],J.prototype,"slotRows",void 0),J};var h=({apply:W,event:J,host:Z,next:K})=>{if(!Z.dispatchEvent(J(K)))return!1;return W(K),!0};var o2=(W,J)=>J.find((Z)=>Z.value===W)??J.find((Z)=>!Z.disabled);var r2=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},t1=(W)=>{class J extends W{constructor(){super(...arguments);this.defaultActive="",this.activeState=void 0}get active(){return this.activeState??this.defaultActive}set active(Z){let K=this.active;this.activeState=Z,this.requestUpdate("active",K)}requestActive(Z){if(Z===this.active)return!0;return h({apply:(K)=>{let Q=this.active;this.activeState=K,this.requestUpdate("active",Q)},event:(K)=>new b1({value:K}),host:this,next:Z})}resolveActive(Z){return o2(this.active,Z)}}return r2([q()],J.prototype,"active",null),r2([q({attribute:"default-active"})],J.prototype,"defaultActive",void 0),J};var t2=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},h5=(W)=>{class J extends W{constructor(){super(...arguments);this.defaultChecked=!1,this.checkedState=void 0}get checked(){return this.checkedState??this.defaultChecked}set checked(Z){let K=this.checked;this.checkedState=Z,this.requestUpdate("checked",K)}willUpdate(Z){super.willUpdate(Z),this.toggleState("checked",this.checked)}requestChecked(Z){if(this.checked===Z)return!0;let K=h({apply:(Q)=>{let Y=this.checked;this.checkedState=Q,this.requestUpdate("checked",Y)},event:(Q)=>new P8({checked:Q}),host:this,next:Z});if(K)this.dispatchEvent(new Event("input",{bubbles:!0,composed:!0}));return K}toggleChecked(){return this.requestChecked(!this.checked)}formStateRestoreCallback(Z){this.checked=Z!==null}resetChecked(){let Z=this.checked;this.checkedState=void 0,this.requestUpdate("checked",Z)}}return t2([q({type:Boolean})],J.prototype,"checked",null),t2([q({attribute:"default-checked",type:Boolean})],J.prototype,"defaultChecked",void 0),J};var e2=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},g=(W)=>{class J extends W{constructor(){super(...arguments);this.defaultOpen=!1,this.openState=void 0}get open(){return this.openState??this.defaultOpen}set open(Z){let K=this.open;this.openState=Z,this.requestUpdate("open",K)}willUpdate(Z){super.willUpdate(Z),this.toggleState("open",this.open)}requestOpen(Z){if(this.open===Z)return!0;let K=h({apply:(Q)=>{let Y=this.open;this.openState=Q,this.requestUpdate("open",Y)},event:(Q)=>Q?new X8:new RJ,host:this,next:Z});if(K)this.announceToggle(Z);return K}announceToggle(Z){let K=new Event("toggle",{bubbles:!1,cancelable:!1,composed:!1});Object.assign(K,{newState:Z?"open":"closed",oldState:Z?"closed":"open"}),this.dispatchEvent(K)}toggleOpen(){return this.requestOpen(!this.open)}}return e2([q({type:Boolean})],J.prototype,"open",null),e2([q({attribute:"default-open",type:Boolean})],J.prototype,"defaultOpen",void 0),J};var J3=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},u=(W)=>{class J extends W{constructor(){super(...arguments);this.defaultValue="",this.valueState=void 0,this.announcesInput=!1}get value(){return this.valueState??this.defaultValue}set value(Z){let K=this.value;this.valueState=Z,this.requestUpdate("value",K)}announceNatively(){if(this.dispatchEvent(new Event("input",{bubbles:!0,composed:!0})),!this.announcesInput)this.dispatchEvent(new Event("change",{bubbles:!0,composed:!1}))}requestValue(Z){if(this.value===Z)return!0;let K=h({apply:(Q)=>{let Y=this.value;this.valueState=Q,this.requestUpdate("value",Y)},event:(Q)=>new t0({value:Q}),host:this,next:Z});if(K)this.announceNatively();return K}formResetCallback(){let Z=this.value;this.valueState=void 0,this.requestUpdate("value",Z)}formStateRestoreCallback(Z){let K=this.value;this.valueState=Z??void 0,this.requestUpdate("value",K)}}return J3([q({attribute:"default-value"})],J.prototype,"defaultValue",void 0),J3([q()],J.prototype,"value",null),J};var Z3=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},T7=(W)=>{class J extends W{constructor(){super(...arguments);this.dismissible=!1,this.dismissLabel="Dismiss"}dismissEvent(){let Z=[...this.childNodes].filter((K)=>!(K instanceof Element)||!K.slot).map((K)=>K.textContent??"").join("");return new EJ({label:Z.trim()})}dismiss(){let Z=this.dismissEvent();return this.dispatchEvent(Z),!Z.defaultPrevented}}return Z3([q({reflect:!0,type:Boolean})],J.prototype,"dismissible",void 0),Z3([q({attribute:"dismiss-label"})],J.prototype,"dismissLabel",void 0),J};var L=(W,J)=>{if(J.role!==void 0)W.role=J.role===""?null:J.role;if(J.label!==void 0)W.ariaLabel=J.label===""?null:J.label;if(J.labelledBy!==void 0&&"ariaLabelledByElements"in W)W.ariaLabelledByElements=J.labelledBy.length>0?J.labelledBy:null;if(J.describedBy!==void 0&&"ariaDescribedByElements"in W)W.ariaDescribedByElements=J.describedBy.length>0?J.describedBy:null};var x5=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},qZ="helix-hint",GZ="helix-feedback",k=(W)=>{class J extends W{constructor(){super(...arguments);this.hint="",this.feedback="",this.label="",this.required=!1,this.touched=!1,this.shownFeedback=""}get validates(){return this.constructor.formAssociated===!0}get resolvedFeedback(){if(this.feedback!=="")return this.feedback;if(!this.validates||!this.touched||this.internals.validity.valid)return"";return this.internals.validationMessage}get describedBy(){if(this.resolvedFeedback!=="")return GZ;return this.hint===""?void 0:qZ}renderGroupLabel(){let Z=this.label===""?this.getAttribute("aria-label"):null;if(this.label===""&&!Z)return z;return F`<span part="label" ?data-hidden=${Z!==null}
        ><slot name="label">${this.label||Z}</slot></span
      >`}renderLabel(){let Z=this.label===""?this.getAttribute("aria-label"):null;if(this.label===""&&!Z)return z;return F`<label part="label" for="control" ?data-hidden=${Z!==null}
        ><slot name="label">${this.label||Z}</slot></label
      >`}renderHint(){if(this.hint===""||this.resolvedFeedback!=="")return z;return F`<p part="hint" id=${qZ}><slot name="hint">${this.hint}</slot></p>`}renderFeedback(){let Z=this.resolvedFeedback;if(Z==="")return z;return F`<p part="feedback" id=${GZ} role="alert">
        <slot name="feedback">${Z}</slot>
      </p>`}linkHost(){let Z=this.renderRoot.querySelector('[part="label"]');L(this.internals,{describedBy:[qZ,GZ].map((K)=>this.renderRoot.querySelector(`#${K}`)).filter((K)=>K!==null),labelledBy:Z?[Z]:[]})}refreshFeedback(){let Z=this.resolvedFeedback;if(Z!==this.shownFeedback)this.shownFeedback=Z,this.requestUpdate()}reportRequired(Z,K,Q){if(this.required&&Z)this.internals.setValidity({valueMissing:!0},K,this.renderRoot?.querySelector(`[part="${Q}"]`)??void 0);else this.internals.setValidity({});this.refreshFeedback()}willUpdate(Z){super.willUpdate(Z),this.shownFeedback=this.resolvedFeedback,this.toggleState("invalid",this.shownFeedback!==""),this.internals.ariaInvalid=this.shownFeedback===""?null:"true"}firstUpdated(Z){super.firstUpdated(Z);let K=()=>{this.touched=!0};this.addEventListener("invalid",K),this.addEventListener("change",K)}}return x5([q()],J.prototype,"hint",void 0),x5([q()],J.prototype,"feedback",void 0),x5([q()],J.prototype,"label",void 0),x5([q({reflect:!0,type:Boolean})],J.prototype,"required",void 0),x5([U()],J.prototype,"touched",void 0),J};var D1=(W,J)=>{let Z=W?.assignedElements({flatten:!0})[0];if(!Z)return J;let K=Z;for(let Q=0;Q<4;Q+=1){let Y=K.firstElementChild;if(!Y||K.getClientRects().length>0)return K;K=Y}return K};var u8=(W,J)=>{try{return W.setPointerCapture(J),!0}catch{return!1}};var h1=(W,J)=>{let Z=W??null;while(Z){if(Z instanceof J)return Z;Z=Z.parentNode instanceof ShadowRoot?Z.parentNode.host:Z.parentNode}return null};var N=(W)=>Q6(W);var Y3=new Set,pG=new Set;var gG=[];var nG=(W)=>{if(typeof window==="undefined"||Y3.has(W))return;Y3.add(W),pG.add(W),console.warn(`<${W}> is already registered by a different class, so this page holds two copies of Helix. The first one keeps the tag: every element of this name is built from it, whatever the second copy exports, so \`instanceof\` against the second copy is false and its fixes are not in the DOM. Two dependencies asking for different versions is the usual cause, and a bundler shipping the same version twice is the other. Deduplicate the dependency.`)},G=(W)=>(J)=>{if(typeof customElements==="undefined")return;let Z=customElements.get(W);if(Z){if(Z!==J)nG(W);return}customElements.define(W,J),gG.push(W)};var h8={ATTRIBUTE:1,CHILD:2,PROPERTY:3,BOOLEAN_ATTRIBUTE:4,EVENT:5,ELEMENT:6},xJ=(W)=>(...J)=>({_$litDirective$:W,values:J});class U7{constructor(W){}get _$AU(){return this._$AM._$AU}_$AT(W,J,Z){this._$Ct=W,this._$AM=J,this._$Ci=Z}_$AS(W,J){return this.update(W,J)}update(W,J){return this.render(...J)}}class x8 extends U7{constructor(W){if(super(W),this.it=z,W.type!==h8.CHILD)throw Error(this.constructor.directiveName+"() can only be used in child bindings")}render(W){if(W===z||W==null)return this._t=void 0,this.it=W;if(W===g0)return W;if(typeof W!="string")throw Error(this.constructor.directiveName+"() called with a non-string value");if(W===this.it)return this._t;this.it=W;let J=[W];return J.raw=J,this._t={_$litType$:this.constructor.resultType,strings:J,values:[]}}}x8.directiveName="unsafeHTML",x8.resultType=1;var OB=xJ(x8);class G6 extends x8{}G6.directiveName="unsafeSVG",G6.resultType=2;var S=xJ(G6);var x=(W,J={})=>F`<svg
    aria-hidden="true"
    data-glyph
    fill="currentColor"
    slot=${J.slot??z}
    viewBox=${W.viewBox}
  >
    ${S(W.content)}
  </svg>`;var W3="important",lG=" !"+W3,K3=xJ(class extends U7{constructor(W){if(super(W),W.type!==h8.ATTRIBUTE||W.name!=="style"||W.strings?.length>2)throw Error("The `styleMap` directive must be used in the `style` attribute and must be the only part in the attribute.")}render(W){return Object.keys(W).reduce((J,Z)=>{let K=W[Z];return K==null?J:J+`${Z=Z.includes("-")?Z:Z.replace(/(?:^(webkit|moz|ms|o)|)(?=[A-Z])/g,"-$&").toLowerCase()}:${K};`},"")}update(W,[J]){let{style:Z}=W.element;if(this.ft===void 0)return this.ft=new Set(Object.keys(J)),this.render(J);for(let K of this.ft)J[K]==null&&(this.ft.delete(K),K.includes("-")?Z.removeProperty(K):Z[K]=null);for(let K in J){let Q=J[K];if(Q!=null){this.ft.add(K);let Y=typeof Q=="string"&&Q.endsWith(lG);K.includes("-")||Y?Z.setProperty(K,Y?Q.slice(0,-11):Q,Y?W3:""):Z[K]=Q}}return g0}});var e0=(W,J,Z,K)=>{let Q=W[J];if(!Q||W.length===0)return z;let Y=100/W.length,X=K??{placement:"top",x:`${J*Y+Y/2}%`,y:"0%"};return T`<div
      id="helix-chart-mark"
      part="mark"
      style=${K3({insetBlockStart:X.y,insetInlineStart:X.x})}
    ></div>
    <${Z}
      exportparts="tooltip"
      for="helix-chart-mark"
      open
      part="tooltip-anchor"
      placement=${X.placement}
      within="helix-chart-plot"
    >
      <div aria-hidden="true" slot="content">
        <span part="tooltip-label">${Q.label}</span>
        ${Q.cells.map(($,V)=>T`<span
              data-series=${$.value===void 0?z:c(V)}
              part="tooltip-cell"
            >
              <span part="tooltip-name">${$.name}</span>
              <span part="tooltip-value">${$.text}</span>
            </span>`)}
      </div>
    </${Z}>`};var Q3=new Map,X3=new Map,z6=[{ms:60000,unit:"minute"},{ms:3600000,unit:"hour"},{ms:86400000,unit:"day"}];var cG=(W)=>{let J=Q3.get(W);if(!J)J=z6.map(({unit:Z})=>new Intl.NumberFormat(W||void 0,{style:"unit",unit:Z,unitDisplay:"narrow"})),Q3.set(W,J);return J},dG=(W)=>{let J=X3.get(W);if(!J)J=[new Intl.DateTimeFormat(W||void 0,{day:"numeric",month:"short"}),new Intl.DateTimeFormat(W||void 0,{month:"short",year:"numeric"})],X3.set(W,J);return J},V6=(W)=>{let J=cG(W),Z=dG(W),K=new Intl.RelativeTimeFormat(W||void 0,{numeric:"auto"});return(Q,Y)=>{let X=Y.getTime()-Q.getTime();if(!Number.isFinite(X))return{next:Number.POSITIVE_INFINITY,text:""};let $=Math.abs(X);if($<60000)return{next:Math.max(1000,60000-$),text:K.format(0,"second")};if($>=604800000){let I=Q.getFullYear()===Y.getFullYear()?Z[0]:Z[1];return{next:Number.POSITIVE_INFINITY,text:I.format(Q)}}let V=0;for(let P=0;P<z6.length;P+=1)if($>=z6[P].ms)V=P;let O=z6[V],B=Math.trunc($/O.ms),D=Math.min(O.ms-$%O.ms,604800000-$);return{next:Math.max(1000,Math.min(D,3600000)),text:J[V].format(B)}}};var $3=new Map,C7=(W)=>{let J=$3.get(W);if(!J)J=new Intl.NumberFormat(W||void 0),$3.set(W,J);let Z=J;return(K)=>Z.format(K)};var n0=(W)=>Math.round(W*100)/100,iG=(W,J)=>{let Z=W.length,K=[];for(let Y=0;Y<Z-1;Y+=1)K.push((J[Y+1]-J[Y])/(W[Y+1]-W[Y]));let Q=new Array(Z);Q[0]=K[0],Q[Z-1]=K[Z-2];for(let Y=1;Y<Z-1;Y+=1){let X=K[Y-1],$=K[Y];Q[Y]=X*$<=0?0:(X+$)/2}for(let Y=0;Y<Z-1;Y+=1){let X=K[Y];if(X===0){Q[Y]=0,Q[Y+1]=0;continue}let $=Q[Y]/X,V=Q[Y+1]/X,O=Math.hypot($,V);if(O>3){let B=3/O;Q[Y]=B*$*X,Q[Y+1]=B*V*X}}return Q},L7=(W,J="straight")=>{if(W.length<2)return"";let[Z]=W,K=`M${n0(Z[0])},${n0(Z[1])}`;if(J==="step")return K+W.slice(1).map(([Q,Y],X)=>{return`H${n0(((W[X][0]??0)+Q)/2)}V${n0(Y)}H${n0(Q)}`}).join("");if(J==="smooth"){let Q=W.map(([V])=>V),Y=W.map(([,V])=>V),X=iG(Q,Y),$=K;for(let V=0;V<W.length-1;V+=1){let O=(Q[V+1]-Q[V])/3,B=n0(Q[V]+O),D=n0(Y[V]+X[V]*O),P=n0(Q[V+1]-O),I=n0(Y[V+1]-X[V+1]*O);$+=`C${B},${D} ${P},${I} ${n0(Q[V+1])},${n0(Y[V+1])}`}return $}return K+W.slice(1).map(([Q,Y])=>`L${n0(Q)},${n0(Y)}`).join("")};var M7={fromAttribute:(W)=>W!==null&&W!=="false",toAttribute:(W)=>W?"":"false"};var q3=new Map,G3=[{ms:1000,unit:"second"},{ms:60000,unit:"minute"},{ms:3600000,unit:"hour"},{ms:86400000,unit:"day"},{ms:604800000,unit:"week"},{ms:2629800000,unit:"month"},{ms:31557600000,unit:"year"}],zZ=(W)=>{let J=q3.get(W);if(!J)J=new Intl.RelativeTimeFormat(W||void 0,{numeric:"auto"}),q3.set(W,J);let Z=J;return(K,Q)=>{let Y=K.getTime()-Q.getTime();if(!Number.isFinite(Y))return{next:Number.POSITIVE_INFINITY,text:""};let X=Math.abs(Y);if(X<60000)return{next:Math.max(1000,60000-X),text:Z.format(0,"second")};let $=G3[1];for(let B of G3)if(X>=B.ms)$=B;let V=Math.trunc(Y/$.ms),O=$.ms-X%$.ms;return{next:Math.max(1000,Math.min(O,3600000)),text:Z.format(V,$.unit)}}};var S7=(W)=>{let{selectionDirection:J,selectionEnd:Z,selectionStart:K}=W,Q=W.value.length;return()=>{if(K===null||Z===null)return;let Y=W.value.length-Q,X=($)=>Math.max(0,Math.min(W.value.length,$+Y));W.setSelectionRange(X(K),X(Z),J??void 0)}},Q0=(W,J)=>{if(W.value===J)return;let{selectionDirection:Z,selectionEnd:K,selectionStart:Q}=W,Y=J.length-W.value.length;if(W.value=J,Q===null||K===null)return;let X=($)=>Math.max(0,Math.min(J.length,$+Y));W.setSelectionRange(X(Q),X(K),Z??void 0)};var e1=(W)=>[Math.min(...W),Math.max(...W)],j0=(W,J)=>{let[Z,K]=W,[Q,Y]=J,X=K-Z;if(X===0)return()=>(Q+Y)/2;return($)=>Q+($-Z)/X*(Y-Q)};var yJ=(W,J=5)=>{let[Z,K]=W;if(!Number.isFinite(Z)||!Number.isFinite(K)||Z===K||J<1)return[];let Q=(K-Z)/J,Y=10**Math.floor(Math.log10(Q)),X=Q/Y,$=Y*(X>=7.5?10:X>=3?5:X>=1.5?2:1),V=[];for(let O=Math.ceil(Z/$)*$;O<=K;O+=$){let B=Math.max(0,-Math.floor(Math.log10($)));V.push(Number(O.toFixed(B)))}return V};var sG=(W)=>{let J=W.ownerDocument.body,Z=z3(W);while(Z&&Z!==J){let K=getComputedStyle(Z);if(/\b(auto|scroll|overlay)\b/.test(`${K.overflowX} ${K.overflowY}`))return Z;Z=z3(Z)}return null},z3=(W)=>{if(W.parentElement)return W.parentElement;let J=W.getRootNode();return J instanceof ShadowRoot?J.host:null},R7=(W,J={})=>{let{padding:Z=0,smooth:K=!1}=J,Q=J.scroller??sG(W);if(!Q)return;let Y=W.getBoundingClientRect(),X=Q.getBoundingClientRect(),$={block:X.top-Y.top+Z,inline:X.left-Y.left+Z},V={block:Y.bottom-X.bottom+Z,inline:Y.right-X.right+Z},O=$.inline>0?-$.inline:V.inline>0?V.inline:0,B=$.block>0?-$.block:V.block>0?V.block:0;if(O===0&&B===0)return;let D=globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1;Q.scrollBy({behavior:K&&!D?"smooth":"instant",left:O,top:B})};var o=(W)=>(W?.assignedNodes({flatten:!0})??[]).some((J)=>J.nodeType===Node.ELEMENT_NODE||J.textContent?.trim()!=="");var V3=Symbol.for("helix.ticker"),F3=()=>{let W=globalThis,J=W[V3];if(!J)J={timer:void 0,waiting:new Set},W[V3]=J;return J},VZ=()=>{let W=F3();if(W.timer!==void 0)clearTimeout(W.timer),W.timer=void 0;if(W.waiting.size===0)return;let J=Math.min(...[...W.waiting].map((K)=>K.at)),Z=Math.max(1000,J-Date.now());W.timer=setTimeout(()=>{W.timer=void 0;let K=Date.now();for(let Q of[...W.waiting])if(Q.at<=K)W.waiting.delete(Q),Q.run();VZ()},Z)},FZ=(W,J)=>{let Z=F3(),K={at:Date.now()+W,run:J};return Z.waiting.add(K),VZ(),()=>{Z.waiting.delete(K),VZ()}};var y5={content:'<path d="M137.11,152.19a12,12,0,0,0-18.22,0l-48,56A12,12,0,0,0,80,228h96a12,12,0,0,0,9.11-19.81Zm-31,51.81L128,178.44,149.91,204ZM236,64V176a28,28,0,0,1-28,28h-4a12,12,0,0,1,0-24h4a4,4,0,0,0,4-4V64a4,4,0,0,0-4-4H48a4,4,0,0,0-4,4V176a4,4,0,0,0,4,4h4a12,12,0,0,1,0,24H48a28,28,0,0,1-28-28V64A28,28,0,0,1,48,36H208A28,28,0,0,1,236,64Z"/>',name:"airplay",viewBox:"0 0 256 256"},N3={content:'<path d="M224,44H32A20,20,0,0,0,12,64V88a20,20,0,0,0,16,19.6V192a20,20,0,0,0,20,20H208a20,20,0,0,0,20-20V107.6A20,20,0,0,0,244,88V64A20,20,0,0,0,224,44ZM36,68H220V84H36ZM52,188V108H204v80Zm112-52a12,12,0,0,1-12,12H104a12,12,0,0,1,0-24h48A12,12,0,0,1,164,136Z"/>',name:"archive",viewBox:"0 0 256 256"},m5={content:'<path d="M244,56v48a12,12,0,0,1-12,12H184a12,12,0,1,1,0-24H201.1l-19-17.38c-.13-.12-.26-.24-.38-.37A76,76,0,1,0,127,204h1a75.53,75.53,0,0,0,52.15-20.72,12,12,0,0,1,16.49,17.45A99.45,99.45,0,0,1,128,228h-1.37A100,100,0,1,1,198.51,57.06L220,76.72V56a12,12,0,0,1,24,0Z"/>',name:"arrow-clockwise",viewBox:"0 0 256 256"},p5={content:'<path d="M228,128a100,100,0,0,1-98.66,100H128a99.39,99.39,0,0,1-68.62-27.29,12,12,0,0,1,16.48-17.45,76,76,0,1,0-1.57-109c-.13.13-.25.25-.39.37L54.89,92H72a12,12,0,0,1,0,24H24a12,12,0,0,1-12-12V56a12,12,0,0,1,24,0V76.72L57.48,57.06A100,100,0,0,1,228,128Z"/>',name:"arrow-counter-clockwise",viewBox:"0 0 256 256"},F6={content:'<path d="M208.49,152.49l-72,72a12,12,0,0,1-17,0l-72-72a12,12,0,0,1,17-17L116,187V40a12,12,0,0,1,24,0V187l51.51-51.52a12,12,0,0,1,17,17Z"/>',name:"arrow-down",viewBox:"0 0 256 256"},g5={content:'<path d="M204,32V176a12,12,0,0,1-12,12H77l27.52,27.51a12,12,0,0,1-17,17l-48-48a12,12,0,0,1,0-17l48-48a12,12,0,1,1,17,17L77,164H180V32a12,12,0,0,1,24,0Z"/>',name:"arrow-elbow-down-left",viewBox:"0 0 256 256"},O3={content:'<path d="M228,128a12,12,0,0,1-12,12H69l51.52,51.51a12,12,0,0,1-17,17l-72-72a12,12,0,0,1,0-17l72-72a12,12,0,0,1,17,17L69,116H216A12,12,0,0,1,228,128Z"/>',name:"arrow-left",viewBox:"0 0 256 256"},B3={content:'<path d="M224.49,136.49l-72,72a12,12,0,0,1-17-17L187,140H40a12,12,0,0,1,0-24H187L135.51,64.48a12,12,0,0,1,17-17l72,72A12,12,0,0,1,224.49,136.49Z"/>',name:"arrow-right",viewBox:"0 0 256 256"},A3={content:'<path d="M228,104a12,12,0,0,1-24,0V69l-59.51,59.51a12,12,0,0,1-17-17L187,52H152a12,12,0,0,1,0-24h64a12,12,0,0,1,12,12Zm-44,24a12,12,0,0,0-12,12v64H52V84h64a12,12,0,0,0,0-24H48A20,20,0,0,0,28,80V208a20,20,0,0,0,20,20H176a20,20,0,0,0,20-20V140A12,12,0,0,0,184,128Z"/>',name:"arrow-square-out",viewBox:"0 0 256 256"},N6={content:'<path d="M208.49,120.49a12,12,0,0,1-17,0L140,69V216a12,12,0,0,1-24,0V69L64.49,120.49a12,12,0,0,1-17-17l72-72a12,12,0,0,1,17,0l72,72A12,12,0,0,1,208.49,120.49Z"/>',name:"arrow-up",viewBox:"0 0 256 256"},D3={content:'<path d="M228,128a12,12,0,0,1-12,12H40a12,12,0,0,1,0-24H216A12,12,0,0,1,228,128ZM119.51,96.49a12,12,0,0,0,17,0l32-32a12,12,0,0,0-17-17L140,59V16a12,12,0,0,0-24,0V59L104.49,47.51a12,12,0,0,0-17,17Zm17,63a12,12,0,0,0-17,0l-32,32a12,12,0,0,0,17,17L116,197v43a12,12,0,0,0,24,0V197l11.51,11.52a12,12,0,0,0,17-17Z"/>',name:"arrows-in-line-vertical",viewBox:"0 0 256 256"},P3={content:'<path d="M228,128a12,12,0,0,1-12,12H40a12,12,0,0,1,0-24H216A12,12,0,0,1,228,128ZM104.49,56.48,116,45V88a12,12,0,0,0,24,0V45l11.51,11.51a12,12,0,0,0,17-17l-32-32a12,12,0,0,0-17,0l-32,32a12,12,0,0,0,17,17Zm47,143L140,211V168a12,12,0,0,0-24,0v43l-11.51-11.52a12,12,0,0,0-17,17l32,32a12,12,0,0,0,17,0l32-32a12,12,0,0,0-17-17Z"/>',name:"arrows-out-line-vertical",viewBox:"0 0 256 256"},I3={content:'<path d="M225.29,165.93C216.61,151,212,129.57,212,104a84,84,0,0,0-168,0c0,25.58-4.59,47-13.27,61.93A20.08,20.08,0,0,0,30.66,186,19.77,19.77,0,0,0,48,196H84.18a44,44,0,0,0,87.64,0H208a19.77,19.77,0,0,0,17.31-10A20.08,20.08,0,0,0,225.29,165.93ZM128,212a20,20,0,0,1-19.6-16h39.2A20,20,0,0,1,128,212ZM54.66,172C63.51,154,68,131.14,68,104a60,60,0,0,1,120,0c0,27.13,4.48,50,13.33,68Z"/>',name:"bell",viewBox:"0 0 256 256"},T3={content:'<path d="M232,44H160a43.86,43.86,0,0,0-32,13.85A43.86,43.86,0,0,0,96,44H24A12,12,0,0,0,12,56V200a12,12,0,0,0,12,12H96a20,20,0,0,1,20,20,12,12,0,0,0,24,0,20,20,0,0,1,20-20h72a12,12,0,0,0,12-12V56A12,12,0,0,0,232,44ZM96,188H36V68H96a20,20,0,0,1,20,20V192.81A43.79,43.79,0,0,0,96,188Zm124,0H160a43.71,43.71,0,0,0-20,4.83V88a20,20,0,0,1,20-20h60ZM164,96h32a12,12,0,0,1,0,24H164a12,12,0,0,1,0-24Zm44,52a12,12,0,0,1-12,12H164a12,12,0,0,1,0-24h32A12,12,0,0,1,208,148Z"/>',name:"book-open-text",viewBox:"0 0 256 256"},U3={content:'<path d="M100,100a12,12,0,0,1,12-12h32a12,12,0,0,1,0,24H112A12,12,0,0,1,100,100ZM236,68V196a20,20,0,0,1-20,20H40a20,20,0,0,1-20-20V68A20,20,0,0,1,40,48H76V40a28,28,0,0,1,28-28h48a28,28,0,0,1,28,28v8h36A20,20,0,0,1,236,68ZM100,48h56V40a4,4,0,0,0-4-4H104a4,4,0,0,0-4,4ZM44,72v35.23A180.06,180.06,0,0,0,128,128a180,180,0,0,0,84-20.78V72ZM212,192V133.94A204.27,204.27,0,0,1,128,152a204.21,204.21,0,0,1-84-18.06V192Z"/>',name:"briefcase",viewBox:"0 0 256 256"},n5={content:'<path d="M208,28H188V24a12,12,0,0,0-24,0v4H92V24a12,12,0,0,0-24,0v4H48A20,20,0,0,0,28,48V208a20,20,0,0,0,20,20H208a20,20,0,0,0,20-20V48A20,20,0,0,0,208,28ZM68,52a12,12,0,0,0,24,0h72a12,12,0,0,0,24,0h16V76H52V52ZM52,204V100H204V204Z"/>',name:"calendar-blank",viewBox:"0 0 256 256"},O6={content:'<path d="M208.49,199.51a12,12,0,0,1-17,17l-80-80a12,12,0,0,1,0-17l80-80a12,12,0,0,1,17,17L137,128ZM57,128l71.52-71.51a12,12,0,0,0-17-17l-80,80a12,12,0,0,0,0,17l80,80a12,12,0,0,0,17-17Z"/>',name:"caret-double-left",viewBox:"0 0 256 256"},B6={content:'<path d="M144.49,136.49l-80,80a12,12,0,0,1-17-17L119,128,47.51,56.49a12,12,0,0,1,17-17l80,80A12,12,0,0,1,144.49,136.49Zm80-17-80-80a12,12,0,1,0-17,17L199,128l-71.52,71.51a12,12,0,0,0,17,17l80-80A12,12,0,0,0,224.49,119.51Z"/>',name:"caret-double-right",viewBox:"0 0 256 256"},_0={content:'<path d="M216.49,104.49l-80,80a12,12,0,0,1-17,0l-80-80a12,12,0,0,1,17-17L128,159l71.51-71.52a12,12,0,0,1,17,17Z"/>',name:"caret-down",viewBox:"0 0 256 256"},N0={content:'<path d="M168.49,199.51a12,12,0,0,1-17,17l-80-80a12,12,0,0,1,0-17l80-80a12,12,0,0,1,17,17L97,128Z"/>',name:"caret-left",viewBox:"0 0 256 256"},O0={content:'<path d="M184.49,136.49l-80,80a12,12,0,0,1-17-17L159,128,87.51,56.49a12,12,0,1,1,17-17l80,80A12,12,0,0,1,184.49,136.49Z"/>',name:"caret-right",viewBox:"0 0 256 256"},C3={content:'<path d="M216.49,168.49a12,12,0,0,1-17,0L128,97,56.49,168.49a12,12,0,0,1-17-17l80-80a12,12,0,0,1,17,0l80,80A12,12,0,0,1,216.49,168.49Z"/>',name:"caret-up",viewBox:"0 0 256 256"},L3={content:'<path d="M236,208a12,12,0,0,1-12,12H32a12,12,0,0,1-12-12V48a12,12,0,0,1,24,0v85.55L88.1,95a12,12,0,0,1,15.1-.57l56.22,42.16L216.1,87A12,12,0,1,1,231.9,105l-64,56a12,12,0,0,1-15.1.57L96.58,119.44,44,165.45V196H224A12,12,0,0,1,236,208Z"/>',name:"chart-line",viewBox:"0 0 256 256"},JJ={content:'<path d="M232.49,80.49l-128,128a12,12,0,0,1-17,0l-56-56a12,12,0,1,1,17-17L96,183,215.51,63.51a12,12,0,0,1,17,17Z"/>',name:"check",viewBox:"0 0 256 256"},M3={content:'<path d="M176.49,95.51a12,12,0,0,1,0,17l-56,56a12,12,0,0,1-17,0l-24-24a12,12,0,1,1,17-17L112,143l47.51-47.52A12,12,0,0,1,176.49,95.51ZM236,128A108,108,0,1,1,128,20,108.12,108.12,0,0,1,236,128Zm-24,0a84,84,0,1,0-84,84A84.09,84.09,0,0,0,212,128Z"/>',name:"check-circle",viewBox:"0 0 256 256"},A6={content:'<path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm45.66,85.66-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35a8,8,0,0,1,11.32,11.32Z"/>',name:"check-circle-fill",viewBox:"0 0 256 256"},y8={content:'<path d="M128,20A108,108,0,1,0,236,128,108.12,108.12,0,0,0,128,20Zm0,192a84,84,0,1,1,84-84A84.09,84.09,0,0,1,128,212Z"/>',name:"circle",viewBox:"0 0 256 256"},l5={content:'<path d="M128,20A108,108,0,1,0,236,128,108.12,108.12,0,0,0,128,20Zm0,192a84,84,0,1,1,84-84A84.09,84.09,0,0,1,128,212Zm68-84a12,12,0,0,1-12,12H128a12,12,0,0,1-12-12V72a12,12,0,0,1,24,0v44h44A12,12,0,0,1,196,128Z"/>',name:"clock",viewBox:"0 0 256 256"},c5={content:'<path d="M224,44H32A20,20,0,0,0,12,64V192a20,20,0,0,0,20,20H224a20,20,0,0,0,20-20V64A20,20,0,0,0,224,44Zm-4,144H36V68H220ZM52,128a44,44,0,0,1,66-38.11,12,12,0,0,1-12,20.78,20,20,0,1,0,0,34.66,12,12,0,1,1,12,20.77A44,44,0,0,1,52,128Zm80,0a44,44,0,0,1,66-38.11,12,12,0,0,1-12,20.78,20,20,0,1,0,0,34.66,12,12,0,1,1,12,20.77A44,44,0,0,1,132,128Z"/>',name:"closed-captioning",viewBox:"0 0 256 256"},S3={content:'<path d="M160,36A92.09,92.09,0,0,0,79,84.36,68,68,0,1,0,72,220h88a92,92,0,0,0,0-184Zm0,160H72a44,44,0,0,1-1.82-88A91.86,91.86,0,0,0,68,128a12,12,0,0,0,24,0,68,68,0,1,1,68,68Z"/>',name:"cloud",viewBox:"0 0 256 256"},R3={content:'<path d="M128,20A108,108,0,1,0,236,128,108.12,108.12,0,0,0,128,20Zm0,192a84,84,0,1,1,84-84A84.09,84.09,0,0,1,128,212ZM163.27,77l-56,24a12,12,0,0,0-6.3,6.3l-24,56A12,12,0,0,0,92.73,179l56-24a12,12,0,0,0,6.3-6.3l24-56A12,12,0,0,0,163.27,77Zm-28.41,57.89-24,10.29,10.29-24,24-10.29Z"/>',name:"compass",viewBox:"0 0 256 256"},D6={content:'<path d="M216,28H88A12,12,0,0,0,76,40V76H40A12,12,0,0,0,28,88V216a12,12,0,0,0,12,12H168a12,12,0,0,0,12-12V180h36a12,12,0,0,0,12-12V40A12,12,0,0,0,216,28ZM156,204H52V100H156Zm48-48H180V88a12,12,0,0,0-12-12H100V52H204Z"/>',name:"copy",viewBox:"0 0 256 256"},P6={content:'<path d="M148,96V48a12,12,0,0,1,24,0V84h36a12,12,0,0,1,0,24H160A12,12,0,0,1,148,96ZM96,148H48a12,12,0,0,0,0,24H84v36a12,12,0,0,0,24,0V160A12,12,0,0,0,96,148Zm112,0H160a12,12,0,0,0-12,12v48a12,12,0,0,0,24,0V172h36a12,12,0,0,0,0-24ZM96,36A12,12,0,0,0,84,48V84H48a12,12,0,0,0,0,24H96a12,12,0,0,0,12-12V48A12,12,0,0,0,96,36Z"/>',name:"corners-in",viewBox:"0 0 256 256"},I6={content:'<path d="M220,48V88a12,12,0,0,1-24,0V60H168a12,12,0,0,1,0-24h40A12,12,0,0,1,220,48ZM88,196H60V168a12,12,0,0,0-24,0v40a12,12,0,0,0,12,12H88a12,12,0,0,0,0-24Zm120-40a12,12,0,0,0-12,12v28H168a12,12,0,0,0,0,24h40a12,12,0,0,0,12-12V168A12,12,0,0,0,208,156ZM88,36H48A12,12,0,0,0,36,48V88a12,12,0,0,0,24,0V60H88a12,12,0,0,0,0-24Z"/>',name:"corners-out",viewBox:"0 0 256 256"},E3={content:'<rect width="256" height="256" rx="56" fill="url(#cortex-tile-grad)" /> <g transform="translate(54.2 39.9) scale(2.05)"> <path d="M72 62A22 22 0 0 1 50 84H22A22 22 0 0 1 0 62V22A22 22 0 0 1 22 0H50A22 22 0 0 1 72 22H54V22A4 4 0 0 0 50 18H22A4 4 0 0 0 18 22V62A4 4 0 0 0 22 66H50A4 4 0 0 0 54 62V62Z" fill="var(--logo-color-knockout, #fff)" /> </g> <defs> <linearGradient gradientUnits="userSpaceOnUse" id="cortex-tile-grad" x1="0" x2="256" y1="0" y2="256"> <stop stop-color="var(--logo-color-from, var(--helix-color-primary))" /> <stop offset="1" stop-color="var(--logo-color-to, var(--helix-color-primary-active))" /> </linearGradient> </defs>',name:"cortex",viewBox:"0 0 256 256"},w3={content:'<path d="M225.6,62.64l-88-48.17a19.91,19.91,0,0,0-19.2,0l-88,48.17A20,20,0,0,0,20,80.19v95.62a20,20,0,0,0,10.4,17.55l88,48.17a19.89,19.89,0,0,0,19.2,0l88-48.17A20,20,0,0,0,236,175.81V80.19A20,20,0,0,0,225.6,62.64ZM128,36.57,200,76,128,115.4,56,76ZM44,96.79l72,39.4v76.67L44,173.44Zm96,116.07V136.19l72-39.4v76.65Z"/>',name:"cube",viewBox:"0 0 256 256"},b3={content:'<path d="M144,128a16,16,0,1,1-16-16A16,16,0,0,1,144,128ZM60,112a16,16,0,1,0,16,16A16,16,0,0,0,60,112Zm136,0a16,16,0,1,0,16,16A16,16,0,0,0,196,112Z"/>',name:"dots-three",viewBox:"0 0 256 256"},T6={content:'<path d="M112,60a16,16,0,1,1,16,16A16,16,0,0,1,112,60Zm16,52a16,16,0,1,0,16,16A16,16,0,0,0,128,112Zm0,68a16,16,0,1,0,16,16A16,16,0,0,0,128,180Z"/>',name:"dots-three-vertical",viewBox:"0 0 256 256"},d5={content:'<path d="M71.51,88.49a12,12,0,0,1,17-17L116,99V24a12,12,0,0,1,24,0V99l27.51-27.52a12,12,0,0,1,17,17l-48,48a12,12,0,0,1-17,0ZM224,116H188a12,12,0,0,0,0,24h32v56H36V140H68a12,12,0,0,0,0-24H32a20,20,0,0,0-20,20v64a20,20,0,0,0,20,20H224a20,20,0,0,0,20-20V136A20,20,0,0,0,224,116Zm-20,52a16,16,0,1,0-16,16A16,16,0,0,0,204,168Z"/>',name:"download",viewBox:"0 0 256 256"},f3={content:'<path d="M224,44H32A12,12,0,0,0,20,56V192a20,20,0,0,0,20,20H216a20,20,0,0,0,20-20V56A12,12,0,0,0,224,44Zm-96,83.72L62.85,68h130.3ZM92.79,128,44,172.72V83.28Zm17.76,16.28,9.34,8.57a12,12,0,0,0,16.22,0l9.34-8.57L193.15,188H62.85ZM163.21,128,212,83.28v89.44Z"/>',name:"envelope",viewBox:"0 0 256 256"},U6={content:'<path d="M251,123.13c-.37-.81-9.13-20.26-28.48-39.61C196.63,57.67,164,44,128,44S59.37,57.67,33.51,83.52C14.16,102.87,5.4,122.32,5,123.13a12.08,12.08,0,0,0,0,9.75c.37.82,9.13,20.26,28.49,39.61C59.37,198.34,92,212,128,212s68.63-13.66,94.48-39.51c19.36-19.35,28.12-38.79,28.49-39.61A12.08,12.08,0,0,0,251,123.13Zm-46.06,33C183.47,177.27,157.59,188,128,188s-55.47-10.73-76.91-31.88A130.36,130.36,0,0,1,29.52,128,130.45,130.45,0,0,1,51.09,99.89C72.54,78.73,98.41,68,128,68s55.46,10.73,76.91,31.89A130.36,130.36,0,0,1,226.48,128,130.45,130.45,0,0,1,204.91,156.12ZM128,84a44,44,0,1,0,44,44A44.05,44.05,0,0,0,128,84Zm0,64a20,20,0,1,1,20-20A20,20,0,0,1,128,148Z"/>',name:"eye",viewBox:"0 0 256 256"},C6={content:'<path d="M56.88,31.93A12,12,0,1,0,39.12,48.07l16,17.65C20.67,88.66,5.72,121.58,5,123.13a12.08,12.08,0,0,0,0,9.75c.37.82,9.13,20.26,28.49,39.61C59.37,198.34,92,212,128,212a131.34,131.34,0,0,0,51-10l20.09,22.1a12,12,0,0,0,17.76-16.14ZM128,188c-29.59,0-55.47-10.73-76.91-31.88A130.69,130.69,0,0,1,29.52,128c5.27-9.31,18.79-29.9,42-44.29l90.09,99.11A109.33,109.33,0,0,1,128,188Zm123-55.12c-.36.81-9,20-28,39.16a12,12,0,1,1-17-16.9A130.48,130.48,0,0,0,226.48,128a130.36,130.36,0,0,0-21.57-28.12C183.46,78.73,157.59,68,128,68c-3.35,0-6.7.14-10,.42a12,12,0,1,1-2-23.91c3.93-.34,8-.51,12-.51,36,0,68.63,13.67,94.49,39.52,19.35,19.35,28.11,38.8,28.48,39.61A12.08,12.08,0,0,1,251,132.88Z"/>',name:"eye-slash",viewBox:"0 0 256 256"},L6={content:'<path d="M228,67.24a39.77,39.77,0,0,0-12.51-28.52C199.91,24,174.71,24.5,159.29,39.93L142.48,56.84a28,28,0,0,0-35.64,3.29l-9,9a20,20,0,0,0-.73,27.49L48.9,144.84A43.76,43.76,0,0,0,37,185.28l-7.5,17.19a17.66,17.66,0,0,0,3.71,19.65,19.9,19.9,0,0,0,22.15,4.19l16.31-7.13a43.88,43.88,0,0,0,39.45-12.09l48.24-48.26a20,20,0,0,0,27.47-.73l9-9a28.06,28.06,0,0,0,3.26-35.72l17.23-17.33A39.69,39.69,0,0,0,228,67.24ZM94.15,190.11a20,20,0,0,1-20,5,11.93,11.93,0,0,0-8.32.47L57,199.38,60.69,191a12,12,0,0,0,.37-8.64,19.92,19.92,0,0,1,4.81-20.55l48.2-48.22,28.28,28.3Zm105.14-111-25.37,25.52a12,12,0,0,0,0,16.95l4.88,4.89a4,4,0,0,1,0,5.66l-6.14,6.15-55-55.05,6.14-6.14a4,4,0,0,1,5.65,0L134.35,82a12,12,0,0,0,8.49,3.51h0A12,12,0,0,0,151.34,82l24.94-25.08c6.3-6.3,16.48-6.63,22.71-.74a16,16,0,0,1,.3,23Z"/>',name:"eyedropper",viewBox:"0 0 256 256"},j3={content:'<path d="M242.09,41.5A12,12,0,0,0,232,36H152a12,12,0,0,0-10.92,7l-7.72,17H28a12,12,0,0,0-8.88,20.07L51.78,116,19.12,151.93A12,12,0,0,0,28,172h73.09A12,12,0,0,0,112,165l7.71-17h53.63l-32.28,71A12,12,0,1,0,162.92,229l80-176A12,12,0,0,0,242.09,41.5ZM55.13,148l21.75-23.93a12,12,0,0,0,0-16.14L55.13,84h67.32L93.36,148Zm129.14-24H130.64l29.09-64h53.63Z"/>',name:"flag-banner-fold",viewBox:"0 0 256 256"},_3={content:'<path d="M225.15,197.71,164,95.81V44h4a12,12,0,0,0,0-24H88a12,12,0,0,0,0,24h4V95.81L30.85,197.71A20,20,0,0,0,48,228H208a20,20,0,0,0,17.15-30.29ZM140,44V99.14a12,12,0,0,0,1.71,6.17l35.13,58.54c-10.79.86-25.15-1.31-43.42-10.56-14-7.08-27.46-11.33-40.27-12.76l21.14-35.22A12,12,0,0,0,116,99.14V44ZM55.06,204,79,164.19c13-1.11,27.62,2.42,43.62,10.52,19.61,9.92,36.25,13.31,49.85,13.31A75.44,75.44,0,0,0,190.11,186l10.83,18Z"/>',name:"flask",viewBox:"0 0 256 256"},v3={content:'<path d="M248.23,112.31A20,20,0,0,0,232,104H220V88a20,20,0,0,0-20-20H132L105.34,48a20.12,20.12,0,0,0-12-4H40A20,20,0,0,0,20,64V208a12,12,0,0,0,12,12H211.1a12,12,0,0,0,11.33-8l28.49-81.47.06-.17A20,20,0,0,0,248.23,112.31ZM92,68l28.8,21.6A12,12,0,0,0,128,92h68v12H69.77a20,20,0,0,0-18.94,13.58L44,137.15V68ZM202.59,196H48.89l23.72-68H226.37Z"/>',name:"folder-open",viewBox:"0 0 256 256"},k3={content:'<path d="M204,136a12,12,0,0,1-12,12H64a12,12,0,0,1,0-24H192A12,12,0,0,1,204,136Zm28-60H24a12,12,0,0,0,0,24H232a12,12,0,0,0,0-24Zm-80,96H104a12,12,0,0,0,0,24h48a12,12,0,0,0,0-24Z"/>',name:"funnel-simple",viewBox:"0 0 256 256"},H3={content:'<g transform="translate(42.5 28) scale(2.38)"> <path d="M0 1H72C72 10.9411 63.9411 19 54 19H18C8.05888 19 0 10.9411 0 1Z" fill="url(#fusion-grad-bar-top)" /> <path d="M27.9766 19C27.9766 9.05887 36.0354 1 45.9766 1H71.9766C71.9766 10.9411 63.9177 19 53.9766 19H27.9766Z" fill="url(#fusion-grad-bar-shadow)" /> <path d="M0.00390625 46C0.00390625 34.9543 8.95821 26 20.0039 26H54.0822C54.0822 36.4323 45.6252 44.8893 35.1929 44.8893H25.7129C21.2946 44.8893 17.7129 48.471 17.7129 52.8893V65.9737C17.7129 75.754 9.7843 83.6826 0.00390625 83.6826V46Z" fill="url(#fusion-grad-c)" /> <path d="M0 46C0 34.9543 8.95431 26 20 26H40.2464C40.2464 36.442 31.7815 44.907 21.3395 44.907H21.0588L13.4622 45.5709C6.78541 46.1544 1.29796 51.0805 0 57.6558V46Z" fill="url(#fusion-grad-c-highlight)" /> </g> <defs> <linearGradient gradientUnits="userSpaceOnUse" id="fusion-grad-bar-top" x1="0" x2="72" y1="10" y2="10"> <stop stop-color="var(--logo-color-from, var(--helix-color-primary))" /> <stop offset="1" stop-color="var(--logo-color-to, var(--helix-color-primary-active))" /> </linearGradient> <linearGradient gradientUnits="userSpaceOnUse" id="fusion-grad-bar-shadow" x1="27.9766" x2="71.9766" y1="10" y2="10"> <stop stop-color="var(--logo-color-from, var(--helix-color-primary))" /> <stop offset="1" stop-color="var(--logo-color-to, var(--helix-color-primary-active))" /> </linearGradient> <linearGradient gradientUnits="userSpaceOnUse" id="fusion-grad-c" x1="27.043" x2="27.043" y1="26" y2="83.6826"> <stop stop-color="var(--logo-color-to, var(--helix-color-primary-active))" /> <stop offset="1" stop-color="var(--logo-color-mid, var(--helix-color-primary-hover))" /> </linearGradient> <linearGradient gradientUnits="userSpaceOnUse" id="fusion-grad-c-highlight" x1="20.1232" x2="20.1232" y1="26" y2="57.6558"> <stop stop-color="var(--logo-color-from, var(--helix-color-primary))" /> <stop offset="1" stop-color="var(--logo-color-from, var(--helix-color-primary))" stop-opacity="0.2" /> </linearGradient> </defs>',name:"fusion",viewBox:"0 0 256 256"},M6={content:'<path d="M209.88,69.83A115.19,115.19,0,0,0,128,36h-.41C63.85,36.22,12,88.76,12,153.13V176a20,20,0,0,0,20,20H224a20,20,0,0,0,20-20V152A115.25,115.25,0,0,0,209.88,69.83ZM220,172H127.32l46.44-65A12,12,0,1,0,154.24,93L97.82,172H36V153.13c0-1.72,0-3.43.14-5.13H56a12,12,0,0,0,0-24H40.62c10.91-33.39,40-58.52,75.38-63.21V80a12,12,0,0,0,24,0V60.8A92,92,0,0,1,215.66,124H200a12,12,0,0,0,0,24h19.9c.06,1.33.1,2.66.1,4Z"/>',name:"gauge",viewBox:"0 0 256 256"},u3={content:'<path d="M128,76a52,52,0,1,0,52,52A52.06,52.06,0,0,0,128,76Zm0,80a28,28,0,1,1,28-28A28,28,0,0,1,128,156Zm92-27.21v-1.58l14-17.51a12,12,0,0,0,2.23-10.59A111.75,111.75,0,0,0,225,71.89,12,12,0,0,0,215.89,66L193.61,63.5l-1.11-1.11L190,40.1A12,12,0,0,0,184.11,31a111.67,111.67,0,0,0-27.23-11.27A12,12,0,0,0,146.3,22L128.79,36h-1.58L109.7,22a12,12,0,0,0-10.59-2.23A111.75,111.75,0,0,0,71.89,31.05,12,12,0,0,0,66,40.11L63.5,62.39,62.39,63.5,40.1,66A12,12,0,0,0,31,71.89,111.67,111.67,0,0,0,19.77,99.12,12,12,0,0,0,22,109.7l14,17.51v1.58L22,146.3a12,12,0,0,0-2.23,10.59,111.75,111.75,0,0,0,11.29,27.22A12,12,0,0,0,40.11,190l22.28,2.48,1.11,1.11L66,215.9A12,12,0,0,0,71.89,225a111.67,111.67,0,0,0,27.23,11.27A12,12,0,0,0,109.7,234l17.51-14h1.58l17.51,14a12,12,0,0,0,10.59,2.23A111.75,111.75,0,0,0,184.11,225a12,12,0,0,0,5.91-9.06l2.48-22.28,1.11-1.11L215.9,190a12,12,0,0,0,9.06-5.91,111.67,111.67,0,0,0,11.27-27.23A12,12,0,0,0,234,146.3Zm-24.12-4.89a70.1,70.1,0,0,1,0,8.2,12,12,0,0,0,2.61,8.22l12.84,16.05A86.47,86.47,0,0,1,207,166.86l-20.43,2.27a12,12,0,0,0-7.65,4,69,69,0,0,1-5.8,5.8,12,12,0,0,0-4,7.65L166.86,207a86.47,86.47,0,0,1-10.49,4.35l-16.05-12.85a12,12,0,0,0-7.5-2.62c-.24,0-.48,0-.72,0a70.1,70.1,0,0,1-8.2,0,12.06,12.06,0,0,0-8.22,2.6L99.63,211.33A86.47,86.47,0,0,1,89.14,207l-2.27-20.43a12,12,0,0,0-4-7.65,69,69,0,0,1-5.8-5.8,12,12,0,0,0-7.65-4L49,166.86a86.47,86.47,0,0,1-4.35-10.49l12.84-16.05a12,12,0,0,0,2.61-8.22,70.1,70.1,0,0,1,0-8.2,12,12,0,0,0-2.61-8.22L44.67,99.63A86.47,86.47,0,0,1,49,89.14l20.43-2.27a12,12,0,0,0,7.65-4,69,69,0,0,1,5.8-5.8,12,12,0,0,0,4-7.65L89.14,49a86.47,86.47,0,0,1,10.49-4.35l16.05,12.85a12.06,12.06,0,0,0,8.22,2.6,70.1,70.1,0,0,1,8.2,0,12,12,0,0,0,8.22-2.6l16.05-12.85A86.47,86.47,0,0,1,166.86,49l2.27,20.43a12,12,0,0,0,4,7.65,69,69,0,0,1,5.8,5.8,12,12,0,0,0,7.65,4L207,89.14a86.47,86.47,0,0,1,4.35,10.49l-12.84,16.05A12,12,0,0,0,195.88,123.9Z"/>',name:"gear",viewBox:"0 0 256 256"},h3={content:'<path d="M212.62,75.17A63.7,63.7,0,0,0,206.39,26,12,12,0,0,0,196,20a63.71,63.71,0,0,0-50,24H126A63.71,63.71,0,0,0,76,20a12,12,0,0,0-10.39,6,63.7,63.7,0,0,0-6.23,49.17A61.5,61.5,0,0,0,52,104v8a60.1,60.1,0,0,0,45.76,58.28A43.66,43.66,0,0,0,92,192v4H76a20,20,0,0,1-20-20,44.05,44.05,0,0,0-44-44,12,12,0,0,0,0,24,20,20,0,0,1,20,20,44.05,44.05,0,0,0,44,44H92v12a12,12,0,0,0,24,0V192a20,20,0,0,1,40,0v40a12,12,0,0,0,24,0V192a43.66,43.66,0,0,0-5.76-21.72A60.1,60.1,0,0,0,220,112v-8A61.5,61.5,0,0,0,212.62,75.17ZM196,112a36,36,0,0,1-36,36H112a36,36,0,0,1-36-36v-8a37.87,37.87,0,0,1,6.13-20.12,11.65,11.65,0,0,0,1.58-11.49,39.9,39.9,0,0,1-.4-27.72,39.87,39.87,0,0,1,26.41,17.8A12,12,0,0,0,119.82,68h32.35a12,12,0,0,0,10.11-5.53,39.84,39.84,0,0,1,26.41-17.8,39.9,39.9,0,0,1-.4,27.72,12,12,0,0,0,1.61,11.53A37.85,37.85,0,0,1,196,104Z"/>',name:"github-logo",viewBox:"0 0 256 256"},x3={content:'<rect width="256" height="256" rx="56" fill="url(#helix-tile-grad)" /> <g transform="translate(54.2 39.9) scale(2.05)"> <path d="M0 22A22 22 0 0 1 22 0H22V22.5A11 11 0 0 0 33 33.5H39A11 11 0 0 0 50 22.5V0H50A22 22 0 0 1 72 22V62A22 22 0 0 1 50 84H50V61.5A11 11 0 0 0 39 50.5H33A11 11 0 0 0 22 61.5V84H22A22 22 0 0 1 0 62Z" fill="var(--logo-color-knockout, #fff)" /> </g> <defs> <linearGradient gradientUnits="userSpaceOnUse" id="helix-tile-grad" x1="0" x2="256" y1="0" y2="256"> <stop stop-color="var(--logo-color-from, var(--helix-color-primary))" /> <stop offset="1" stop-color="var(--logo-color-to, var(--helix-color-primary-active))" /> </linearGradient> </defs>',name:"helix",viewBox:"0 0 256 256"},y3={content:'<path d="M222.14,105.85l-80-80a20,20,0,0,0-28.28,0l-80,80A19.86,19.86,0,0,0,28,120v96a12,12,0,0,0,12,12h64a12,12,0,0,0,12-12V164h24v52a12,12,0,0,0,12,12h64a12,12,0,0,0,12-12V120A19.86,19.86,0,0,0,222.14,105.85ZM204,204H164V152a12,12,0,0,0-12-12H104a12,12,0,0,0-12,12v52H52V121.65l76-76,76,76Z"/>',name:"house",viewBox:"0 0 256 256"},m3={content:'<path d="M1.5 0h21l-1.91 21.563L11.977 24l-8.564-2.438L1.5 0zm7.031 9.75l-.232-2.718 10.059.003.23-2.622L5.412 4.41l.698 8.01h9.126l-.326 3.426-2.91.804-2.955-.81-.188-2.11H6.248l.33 4.171L12 19.351l5.379-1.443.744-8.157H8.531z"/>',name:"html5",viewBox:"0 0 24 24"},p3={content:'<path d="M108,84a16,16,0,1,1,16,16A16,16,0,0,1,108,84Zm128,44A108,108,0,1,1,128,20,108.12,108.12,0,0,1,236,128Zm-24,0a84,84,0,1,0-84,84A84.09,84.09,0,0,0,212,128Zm-72,36.68V132a20,20,0,0,0-20-20,12,12,0,0,0-4,23.32V168a20,20,0,0,0,20,20,12,12,0,0,0,4-23.32Z"/>',name:"info",viewBox:"0 0 256 256"},S6={content:'<path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm-4,48a12,12,0,1,1-12,12A12,12,0,0,1,124,72Zm12,112a16,16,0,0,1-16-16V128a8,8,0,0,1,0-16,16,16,0,0,1,16,16v40a8,8,0,0,1,0,16Z"/>',name:"info-fill",viewBox:"0 0 256 256"},g3={content:'<path d="M232,156h-4V72a28,28,0,0,0-28-28H56A28,28,0,0,0,28,72v84H24a12,12,0,0,0-12,12v24a28,28,0,0,0,28,28H216a28,28,0,0,0,28-28V168A12,12,0,0,0,232,156ZM52,72a4,4,0,0,1,4-4H200a4,4,0,0,1,4,4v84H52ZM220,192a4,4,0,0,1-4,4H40a4,4,0,0,1-4-4V180H220ZM156,96a12,12,0,0,1-12,12H112a12,12,0,0,1,0-24h32A12,12,0,0,1,156,96Z"/>',name:"laptop",viewBox:"0 0 256 256"},n3={content:'<path d="M216,36H40A20,20,0,0,0,20,56V200a20,20,0,0,0,20,20H216a20,20,0,0,0,20-20V56A20,20,0,0,0,216,36Zm-4,24V92H44V60ZM44,116H92v80H44Zm72,80V116h96v80Z"/>',name:"layout",viewBox:"0 0 256 256"},l3={content:'<path d="M180,232a12,12,0,0,1-12,12H88a12,12,0,0,1,0-24h80A12,12,0,0,1,180,232Zm40-128a91.51,91.51,0,0,1-35.17,72.35A12.26,12.26,0,0,0,180,186v2a20,20,0,0,1-20,20H96a20,20,0,0,1-20-20v-2a12,12,0,0,0-4.7-9.51A91.57,91.57,0,0,1,36,104.52C35.73,54.69,76,13.2,125.79,12A92,92,0,0,1,220,104Zm-24,0a68,68,0,0,0-69.65-68C89.56,36.88,59.8,67.55,60,104.38a67.71,67.71,0,0,0,26.1,53.19A35.87,35.87,0,0,1,100,184h56.1A36.13,36.13,0,0,1,170,157.49,67.68,67.68,0,0,0,196,104Zm-20.07-5.32a48.5,48.5,0,0,0-31.91-40,12,12,0,0,0-8,22.62,24.31,24.31,0,0,1,16.09,20,12,12,0,0,0,23.86-2.64Z"/>',name:"lightbulb",viewBox:"0 0 256 256"},c3={content:'<path d="M117.18,188.74a12,12,0,0,1,0,17l-5.12,5.12A58.26,58.26,0,0,1,70.6,228h0A58.62,58.62,0,0,1,29.14,127.92L63.89,93.17a58.64,58.64,0,0,1,98.56,28.11,12,12,0,1,1-23.37,5.44,34.65,34.65,0,0,0-58.22-16.58L46.11,144.89A34.62,34.62,0,0,0,70.57,204h0a34.41,34.41,0,0,0,24.49-10.14l5.11-5.12A12,12,0,0,1,117.18,188.74ZM226.83,45.17a58.65,58.65,0,0,0-82.93,0l-5.11,5.11a12,12,0,0,0,17,17l5.12-5.12a34.63,34.63,0,1,1,49,49L175.1,145.86A34.39,34.39,0,0,1,150.61,156h0a34.63,34.63,0,0,1-33.69-26.72,12,12,0,0,0-23.38,5.44A58.64,58.64,0,0,0,150.56,180h.05a58.28,58.28,0,0,0,41.47-17.17l34.75-34.75a58.62,58.62,0,0,0,0-82.91Z"/>',name:"link",viewBox:"0 0 256 256"},d3={content:'<path d="M216,20H40A20,20,0,0,0,20,40V216a20,20,0,0,0,20,20H216a20,20,0,0,0,20-20V40A20,20,0,0,0,216,20Zm-4,192H44V44H212ZM112,176V120a12,12,0,0,1,21.43-7.41A40,40,0,0,1,192,148v28a12,12,0,0,1-24,0V148a16,16,0,0,0-32,0v28a12,12,0,0,1-24,0ZM96,120v56a12,12,0,0,1-24,0V120a12,12,0,0,1,24,0ZM68,80A16,16,0,1,1,84,96,16,16,0,0,1,68,80Z"/>',name:"linkedin-logo",viewBox:"0 0 256 256"},R6={content:'<path d="M228,128a12,12,0,0,1-12,12H40a12,12,0,0,1,0-24H216A12,12,0,0,1,228,128ZM40,76H216a12,12,0,0,0,0-24H40a12,12,0,0,0,0,24ZM216,180H40a12,12,0,0,0,0,24H216a12,12,0,0,0,0-24Z"/>',name:"list",viewBox:"0 0 256 256"},i5={content:'<path d="M232.49,215.51,185,168a92.12,92.12,0,1,0-17,17l47.53,47.54a12,12,0,0,0,17-17ZM44,112a68,68,0,1,1,68,68A68.07,68.07,0,0,1,44,112Z"/>',name:"magnifying-glass",viewBox:"0 0 256 256"},i3={content:'<path d="M224,204H212A92.1,92.1,0,0,0,148,60.78V32a20,20,0,0,0-20-20H80A20,20,0,0,0,60,32v96a20,20,0,0,0,20,20h48a20,20,0,0,0,20-20V85.08A68.1,68.1,0,0,1,204,152a67.39,67.39,0,0,1-24.18,52H32a12,12,0,0,0,0,24H224a12,12,0,0,0,0-24ZM124,124H84V36h40ZM72,188a12,12,0,0,1,0-24h64a12,12,0,0,1,0,24Z"/>',name:"microscope",viewBox:"0 0 256 256"},E7={content:'<path d="M228,128a12,12,0,0,1-12,12H40a12,12,0,0,1,0-24H216A12,12,0,0,1,228,128Z"/>',name:"minus",viewBox:"0 0 256 256"},s3={content:'<path d="M208,36H48A28,28,0,0,0,20,64V176a28,28,0,0,0,28,28H208a28,28,0,0,0,28-28V64A28,28,0,0,0,208,36Zm4,140a4,4,0,0,1-4,4H48a4,4,0,0,1-4-4V64a4,4,0,0,1,4-4H208a4,4,0,0,1,4,4Zm-40,52a12,12,0,0,1-12,12H96a12,12,0,0,1,0-24h64A12,12,0,0,1,172,228Z"/>',name:"monitor",viewBox:"0 0 256 256"},a3={content:'<path d="M236.37,139.4a12,12,0,0,0-12-3A84.07,84.07,0,0,1,119.6,31.59a12,12,0,0,0-15-15A108.86,108.86,0,0,0,49.69,55.07,108,108,0,0,0,136,228a107.09,107.09,0,0,0,64.93-21.69,108.86,108.86,0,0,0,38.44-54.94A12,12,0,0,0,236.37,139.4Zm-49.88,47.74A84,84,0,0,1,68.86,69.51,84.93,84.93,0,0,1,92.27,48.29Q92,52.13,92,56A108.12,108.12,0,0,0,200,164q3.87,0,7.71-.27A84.79,84.79,0,0,1,186.49,187.14Z"/>',name:"moon",viewBox:"0 0 256 256"},o3={content:'<path d="M108,108a12,12,0,0,1,12-12h56a12,12,0,0,1,0,24H120A12,12,0,0,1,108,108Zm68,28H120a12,12,0,0,0,0,24h56a12,12,0,0,0,0-24Zm52-88V208a20,20,0,0,1-20,20H48a20,20,0,0,1-20-20V48A20,20,0,0,1,48,28H208A20,20,0,0,1,228,48ZM52,204H68V52H52ZM204,52H92V204H204Z"/>',name:"notebook",viewBox:"0 0 256 256"},r3={content:'<path d="M203.57,51A107.9,107.9,0,0,0,20,128c0,44.72,27.6,82.25,72,97.94A36,36,0,0,0,140,192a12,12,0,0,1,12-12h46.21a35.79,35.79,0,0,0,35.1-28A108.6,108.6,0,0,0,236,127.09,107.23,107.23,0,0,0,203.57,51Zm6.34,95.67a11.91,11.91,0,0,1-11.7,9.3H152a36,36,0,0,0-36,36,12,12,0,0,1-16,11.3c-16.65-5.88-30.65-15.76-40.48-28.56A76,76,0,0,1,44,128a84,84,0,0,1,83.13-84H128a84.35,84.35,0,0,1,84,83.29A84.72,84.72,0,0,1,209.91,146.71ZM144,76a16,16,0,1,1-16-16A16,16,0,0,1,144,76Zm-44,24A16,16,0,1,1,84,84,16,16,0,0,1,100,100Zm0,56a16,16,0,1,1-16-16A16,16,0,0,1,100,156Zm88-56a16,16,0,1,1-16-16A16,16,0,0,1,188,100Z"/>',name:"palette",viewBox:"0 0 256 256"},E6={content:'<path d="M200,28H160a20,20,0,0,0-20,20V208a20,20,0,0,0,20,20h40a20,20,0,0,0,20-20V48A20,20,0,0,0,200,28Zm-4,176H164V52h32ZM96,28H56A20,20,0,0,0,36,48V208a20,20,0,0,0,20,20H96a20,20,0,0,0,20-20V48A20,20,0,0,0,96,28ZM92,204H60V52H92Z"/>',name:"pause",viewBox:"0 0 256 256"},s5={content:'<path d="M216,44H40A20,20,0,0,0,20,64V192a20,20,0,0,0,20,20H216a20,20,0,0,0,20-20V64A20,20,0,0,0,216,44ZM44,68H212v48H136a12,12,0,0,0-12,12v60H44ZM148,188V140h64v48Z"/>',name:"picture-in-picture",viewBox:"0 0 256 256"},mJ={content:'<path d="M234.49,111.07,90.41,22.94A20,20,0,0,0,60,39.87V216.13a20,20,0,0,0,30.41,16.93l144.08-88.13a19.82,19.82,0,0,0,0-33.86ZM84,208.85V47.15L216.16,128Z"/>',name:"play",viewBox:"0 0 256 256"},w7={content:'<path d="M228,128a12,12,0,0,1-12,12H140v76a12,12,0,0,1-24,0V140H40a12,12,0,0,1,0-24h76V40a12,12,0,0,1,24,0v76h76A12,12,0,0,1,228,128Z"/>',name:"plus",viewBox:"0 0 256 256"},t3={content:'<path d="M244,128a12,12,0,0,1-12,12H207.42l-36.69,73.37A12,12,0,0,1,160,220h-.6a12,12,0,0,1-10.61-7.72L95,71.15,66.92,133A12,12,0,0,1,56,140H24a12,12,0,0,1,0-24H48.27L85.08,35a12,12,0,0,1,22.13.7l54.28,142.46,27.78-55.56A12,12,0,0,1,200,116h32A12,12,0,0,1,244,128Z"/>',name:"pulse",viewBox:"0 0 256 256"},e3={content:'<path d="M238.15,78.54,177.46,17.86a20,20,0,0,0-28.3,0L97.2,70c-12.43-3.33-36.68-5.72-61.74,14.5a20,20,0,0,0-1.6,29.73l45.46,45.47-39.8,39.8a12,12,0,0,0,17,17l39.8-39.81,45.47,45.46A20,20,0,0,0,155.91,228c.46,0,.93,0,1.4-.05A20,20,0,0,0,171.87,220c4.69-6.23,11-16.13,14.44-28s3.45-22.88.16-33.4l51.7-51.87A20,20,0,0,0,238.15,78.54Zm-74.26,68.79a12,12,0,0,0-2.23,13.84c3.43,6.86,6.9,21-6.28,40.65L54.08,100.53c21.09-14.59,39.53-6.64,41-6a11.67,11.67,0,0,0,13.81-2.29l54.43-54.61,55,55Z"/>',name:"push-pin",viewBox:"0 0 256 256"},JW={content:'<path d="M56.88,31.93A12,12,0,1,0,39.12,48.07L60,71A76,76,0,0,0,35.46,84.51a20,20,0,0,0-1.6,29.73l45.46,45.47-39.8,39.8a12,12,0,0,0,17,17l39.8-39.81,45.47,45.46A20,20,0,0,0,155.9,228c.47,0,.94,0,1.41-.05A20,20,0,0,0,171.87,220a97.47,97.47,0,0,0,9.54-15.46l17.72,19.49a12,12,0,1,0,17.76-16.14Zm98.49,169.88L54.08,100.52C62,95,70.31,92.12,78.91,91.83l84.51,93A62,62,0,0,1,155.37,201.81Zm82.78-95-39,39.11a12,12,0,1,1-17-16.95l36.19-36.3-55-55L130.59,70.5a12,12,0,0,1-17-16.94l35.57-35.69a20,20,0,0,1,28.3,0l60.69,60.68A20,20,0,0,1,238.15,106.83Z"/>',name:"push-pin-slash",viewBox:"0 0 256 256"},ZW={content:'<path d="M14.23 12.004a2.236 2.236 0 0 1-2.235 2.236 2.236 2.236 0 0 1-2.236-2.236 2.236 2.236 0 0 1 2.235-2.236 2.236 2.236 0 0 1 2.236 2.236zm2.648-10.69c-1.346 0-3.107.96-4.888 2.622-1.78-1.653-3.542-2.602-4.887-2.602-.41 0-.783.093-1.106.278-1.375.793-1.683 3.264-.973 6.365C1.98 8.917 0 10.42 0 12.004c0 1.59 1.99 3.097 5.043 4.03-.704 3.113-.39 5.588.988 6.38.32.187.69.275 1.102.275 1.345 0 3.107-.96 4.888-2.624 1.78 1.654 3.542 2.603 4.887 2.603.41 0 .783-.09 1.106-.275 1.374-.792 1.683-3.263.973-6.365C22.02 15.096 24 13.59 24 12.004c0-1.59-1.99-3.097-5.043-4.032.704-3.11.39-5.587-.988-6.38-.318-.184-.688-.277-1.092-.278zm-.005 1.09v.006c.225 0 .406.044.558.127.666.382.955 1.835.73 3.704-.054.46-.142.945-.25 1.44-.96-.236-2.006-.417-3.107-.534-.66-.905-1.345-1.727-2.035-2.447 1.592-1.48 3.087-2.292 4.105-2.295zm-9.77.02c1.012 0 2.514.808 4.11 2.28-.686.72-1.37 1.537-2.02 2.442-1.107.117-2.154.298-3.113.538-.112-.49-.195-.964-.254-1.42-.23-1.868.054-3.32.714-3.707.19-.09.4-.127.563-.132zm4.882 3.05c.455.468.91.992 1.36 1.564-.44-.02-.89-.034-1.345-.034-.46 0-.915.01-1.36.034.44-.572.895-1.096 1.345-1.565zM12 8.1c.74 0 1.477.034 2.202.093.406.582.802 1.203 1.183 1.86.372.64.71 1.29 1.018 1.946-.308.655-.646 1.31-1.013 1.95-.38.66-.773 1.288-1.18 1.87-.728.063-1.466.098-2.21.098-.74 0-1.477-.035-2.202-.093-.406-.582-.802-1.204-1.183-1.86-.372-.64-.71-1.29-1.018-1.946.303-.657.646-1.313 1.013-1.954.38-.66.773-1.286 1.18-1.868.728-.064 1.466-.098 2.21-.098zm-3.635.254c-.24.377-.48.763-.704 1.16-.225.39-.435.782-.635 1.174-.265-.656-.49-1.31-.676-1.947.64-.15 1.315-.283 2.015-.386zm7.26 0c.695.103 1.365.23 2.006.387-.18.632-.405 1.282-.66 1.933-.2-.39-.41-.783-.64-1.174-.225-.392-.465-.774-.705-1.146zm3.063.675c.484.15.944.317 1.375.498 1.732.74 2.852 1.708 2.852 2.476-.005.768-1.125 1.74-2.857 2.475-.42.18-.88.342-1.355.493-.28-.958-.646-1.956-1.1-2.98.45-1.017.81-2.01 1.085-2.964zm-13.395.004c.278.96.645 1.957 1.1 2.98-.45 1.017-.812 2.01-1.086 2.964-.484-.15-.944-.318-1.37-.5-1.732-.737-2.852-1.706-2.852-2.474 0-.768 1.12-1.742 2.852-2.476.42-.18.88-.342 1.356-.494zm11.678 4.28c.265.657.49 1.312.676 1.948-.64.157-1.316.29-2.016.39.24-.375.48-.762.705-1.158.225-.39.435-.788.636-1.18zm-9.945.02c.2.392.41.783.64 1.175.23.39.465.772.705 1.143-.695-.102-1.365-.23-2.006-.386.18-.63.406-1.282.66-1.933zM17.92 16.32c.112.493.2.968.254 1.423.23 1.868-.054 3.32-.714 3.708-.147.09-.338.128-.563.128-1.012 0-2.514-.807-4.11-2.28.686-.72 1.37-1.536 2.02-2.44 1.107-.118 2.154-.3 3.113-.54zm-11.83.01c.96.234 2.006.415 3.107.532.66.905 1.345 1.727 2.035 2.446-1.595 1.483-3.092 2.295-4.11 2.295-.22-.005-.406-.05-.553-.132-.666-.38-.955-1.834-.73-3.703.054-.46.142-.944.25-1.438zm4.56.64c.44.02.89.034 1.345.034.46 0 .915-.01 1.36-.034-.44.572-.895 1.095-1.345 1.565-.455-.47-.91-.993-1.36-1.565z"/>',name:"react",viewBox:"0 0 24 24"},YW={content:'<path d="M68,100A12,12,0,0,1,80,88h96a12,12,0,0,1,0,24H80A12,12,0,0,1,68,100Zm12,52h96a12,12,0,0,0,0-24H80a12,12,0,0,0,0,24ZM236,56V208a12,12,0,0,1-17.37,10.73L192,205.42l-26.63,13.31a12,12,0,0,1-10.74,0L128,205.42l-26.63,13.31a12,12,0,0,1-10.74,0L64,205.42,37.37,218.73A12,12,0,0,1,20,208V56A20,20,0,0,1,40,36H216A20,20,0,0,1,236,56Zm-24,4H44V188.58l14.63-7.31a12,12,0,0,1,10.74,0L96,194.58l26.63-13.31a12,12,0,0,1,10.74,0L160,194.58l26.63-13.31a12,12,0,0,1,10.74,0L212,188.58Z"/>',name:"receipt",viewBox:"0 0 256 256"},m8={content:'<path d="M128,20A108,108,0,1,0,236,128,108.12,108.12,0,0,0,128,20Zm0,192a84,84,0,1,1,84-84A84.09,84.09,0,0,1,128,212Zm0-148a64,64,0,1,0,64,64A64.07,64.07,0,0,0,128,64Zm0,104a40,40,0,1,1,40-40A40,40,0,0,1,128,168Z"/>',name:"record",viewBox:"0 0 256 256"},WW={content:'<path d="M176,156a43.78,43.78,0,0,0-29.09,11L106.1,140.8a44.07,44.07,0,0,0,0-25.6L146.91,89a43.83,43.83,0,1,0-13-20.17L93.09,95a44,44,0,1,0,0,65.94L133.9,187.2A44,44,0,1,0,176,156Zm0-120a20,20,0,1,1-20,20A20,20,0,0,1,176,36ZM64,148a20,20,0,1,1,20-20A20,20,0,0,1,64,148Zm112,72a20,20,0,1,1,20-20A20,20,0,0,1,176,220Z"/>',name:"share-network",viewBox:"0 0 256 256"},KW={content:'<path d="M208,36H48A20,20,0,0,0,28,56v56c0,54.29,26.32,87.22,48.4,105.29,23.71,19.39,47.44,26,48.44,26.29a12.1,12.1,0,0,0,6.32,0c1-.28,24.73-6.9,48.44-26.29,22.08-18.07,48.4-51,48.4-105.29V56A20,20,0,0,0,208,36Zm-4,76c0,35.71-13.09,64.69-38.91,86.15A126.28,126.28,0,0,1,128,219.38a126.14,126.14,0,0,1-37.09-21.23C65.09,176.69,52,147.71,52,112V60H204ZM79.51,144.49a12,12,0,1,1,17-17L112,143l47.51-47.52a12,12,0,0,1,17,17l-56,56a12,12,0,0,1-17,0Z"/>',name:"shield-check",viewBox:"0 0 256 256"},QW={content:'<path d="M216,36H40A20,20,0,0,0,20,56V200a20,20,0,0,0,20,20H216a20,20,0,0,0,20-20V56A20,20,0,0,0,216,36ZM44,60H76V196H44ZM212,196H100V60H212Z"/>',name:"sidebar-simple",viewBox:"0 0 256 256"},XW={content:'<path d="M124,216a12,12,0,0,1-12,12H48a12,12,0,0,1-12-12V40A12,12,0,0,1,48,28h64a12,12,0,0,1,0,24H60V204h52A12,12,0,0,1,124,216Zm108.49-96.49-40-40a12,12,0,0,0-17,17L195,116H112a12,12,0,0,0,0,24h83l-19.52,19.51a12,12,0,0,0,17,17l40-40A12,12,0,0,0,232.49,119.51Z"/>',name:"sign-out",viewBox:"0 0 256 256"},a5={content:'<path d="M201.75,30.52a20,20,0,0,0-20.3.53L68,102V40a12,12,0,0,0-24,0V216a12,12,0,0,0,24,0V154l113.45,71A20,20,0,0,0,212,208.12V47.88A19.86,19.86,0,0,0,201.75,30.52ZM188,200.73,71.7,128,188,55.27Z"/>',name:"skip-back",viewBox:"0 0 256 256"},o5={content:'<path d="M200,28a12,12,0,0,0-12,12v62l-113.45-71A20,20,0,0,0,44,47.88V208.12A20,20,0,0,0,74.55,225L188,154v62a12,12,0,0,0,24,0V40A12,12,0,0,0,200,28ZM68,200.73V55.27L184.3,128Z"/>',name:"skip-forward",viewBox:"0 0 256 256"},$W={content:'<path d="M40,92H70.06a36,36,0,0,0,67.88,0H216a12,12,0,0,0,0-24H137.94a36,36,0,0,0-67.88,0H40a12,12,0,0,0,0,24Zm64-24A12,12,0,1,1,92,80,12,12,0,0,1,104,68Zm112,96H201.94a36,36,0,0,0-67.88,0H40a12,12,0,0,0,0,24h94.06a36,36,0,0,0,67.88,0H216a12,12,0,0,0,0-24Zm-48,24a12,12,0,1,1,12-12A12,12,0,0,1,168,188Z"/>',name:"sliders-horizontal",viewBox:"0 0 256 256"},w6={content:'<path d="M157.27,21.22a12,12,0,0,0-12.64,1.31L75.88,76H32A20,20,0,0,0,12,96v64a20,20,0,0,0,20,20H75.88l68.75,53.47A12,12,0,0,0,164,224V32A12,12,0,0,0,157.27,21.22ZM36,100H68v56H36Zm104,99.46L92,162.13V93.87l48-37.33ZM212,128a44,44,0,0,1-11,29.11,12,12,0,1,1-18-15.88,20,20,0,0,0,0-26.43,12,12,0,0,1,18-15.86A43.94,43.94,0,0,1,212,128Zm40,0a83.87,83.87,0,0,1-21.39,56,12,12,0,0,1-17.89-16,60,60,0,0,0,0-80,12,12,0,1,1,17.88-16A83.87,83.87,0,0,1,252,128Z"/>',name:"speaker-high",viewBox:"0 0 256 256"},b6={content:'<path d="M157.27,21.22a12,12,0,0,0-12.64,1.31L75.88,76H32A20,20,0,0,0,12,96v64a20,20,0,0,0,20,20H75.88l68.75,53.47A12,12,0,0,0,164,224V32A12,12,0,0,0,157.27,21.22ZM36,100H68v56H36Zm104,99.47L92,162.12V93.88l48-37.34Zm108.49-55.95a12,12,0,0,1-17,17L216,145l-15.51,15.52a12,12,0,0,1-17-17L199,128l-15.52-15.51a12,12,0,0,1,17-17L216,111l15.51-15.51a12,12,0,0,1,17,17L233,128Z"/>',name:"speaker-x",viewBox:"0 0 256 256"},qW={content:'<path d="M234.36,170A12,12,0,0,1,230,186.37l-96,56a12,12,0,0,1-12.1,0l-96-56a12,12,0,0,1,12.09-20.74l90,52.48L218,165.63A12,12,0,0,1,234.36,170ZM218,117.63,128,170.11,38.05,117.63A12,12,0,0,0,26,138.37l96,56a12,12,0,0,0,12.1,0l96-56A12,12,0,0,0,218,117.63ZM20,80a12,12,0,0,1,6-10.37l96-56a12.06,12.06,0,0,1,12.1,0l96,56a12,12,0,0,1,0,20.74l-96,56a12,12,0,0,1-12.1,0l-96-56A12,12,0,0,1,20,80Zm35.82,0L128,122.11,200.18,80,128,37.89Z"/>',name:"stack",viewBox:"0 0 256 256"},r5={content:'<path d="M200,36H56A20,20,0,0,0,36,56V200a20,20,0,0,0,20,20H200a20,20,0,0,0,20-20V56A20,20,0,0,0,200,36Zm-4,160H60V60H196Z"/>',name:"stop",viewBox:"0 0 256 256"},GW={content:'<path d="M80,144a40,40,0,1,0,40,40A40,40,0,0,0,80,144Zm0,56a16,16,0,1,1,16-16A16,16,0,0,1,80,200ZM48,128a12,12,0,0,1-8.49-20.49L51,96,39.51,84.49a12,12,0,0,1,17-17L68,79,79.51,67.51a12,12,0,0,1,17,17L85,96l11.52,11.51a12,12,0,0,1-17,17L68,113,56.49,124.49A12,12,0,0,1,48,128Zm184.49,75.51a12,12,0,0,1-17,17L204,209l-11.51,11.52a12,12,0,0,1-17-17L187,192l-11.52-11.51a12,12,0,0,1,17-17L204,175l11.51-11.52a12,12,0,0,1,17,17L221,192Zm-43.4-92.62c-5.21,23-23.33,43.53-45.09,51.22a12,12,0,1,1-8-22.63c14.07-5,26.27-18.91,29.67-33.9,2.37-10.46.4-20.84-5.68-30.54v9a12,12,0,0,1-24,0V44a12,12,0,0,1,12-12h40a12,12,0,0,1,0,24H176C188.77,72.61,193.42,91.76,189.09,110.89Z"/>',name:"strategy",viewBox:"0 0 256 256"},zW={content:'<path d="M116,36V20a12,12,0,0,1,24,0V36a12,12,0,0,1-24,0Zm80,92a68,68,0,1,1-68-68A68.07,68.07,0,0,1,196,128Zm-24,0a44,44,0,1,0-44,44A44.05,44.05,0,0,0,172,128ZM51.51,68.49a12,12,0,1,0,17-17l-12-12a12,12,0,0,0-17,17Zm0,119-12,12a12,12,0,0,0,17,17l12-12a12,12,0,1,0-17-17ZM196,72a12,12,0,0,0,8.49-3.51l12-12a12,12,0,0,0-17-17l-12,12A12,12,0,0,0,196,72Zm8.49,115.51a12,12,0,0,0-17,17l12,12a12,12,0,0,0,17-17ZM48,128a12,12,0,0,0-12-12H20a12,12,0,0,0,0,24H36A12,12,0,0,0,48,128Zm80,80a12,12,0,0,0-12,12v16a12,12,0,0,0,24,0V220A12,12,0,0,0,128,208Zm108-92H220a12,12,0,0,0,0,24h16a12,12,0,0,0,0-24Z"/>',name:"sun",viewBox:"0 0 256 256"},VW={content:'<path d="M250,121.34,204.36,52.91A20,20,0,0,0,187.72,44H40A20,20,0,0,0,20,64V192a20,20,0,0,0,20,20H187.72a20,20,0,0,0,16.64-8.91L250,134.66A12,12,0,0,0,250,121.34ZM185.58,188H44V68H185.58l40,60Z"/>',name:"tag-simple",viewBox:"0 0 256 256"},FW={content:'<path d="M185.08,114.46A48,48,0,0,0,148,36H80A12,12,0,0,0,68,48V200a12,12,0,0,0,12,12h80a52,52,0,0,0,25.08-97.54ZM92,60h56a24,24,0,0,1,0,48H92Zm68,128H92V132h68a28,28,0,0,1,0,56Z"/>',name:"text-b",viewBox:"0 0 256 256"},NW={content:'<path d="M204,56a12,12,0,0,1-12,12H160.65l-40,120H144a12,12,0,0,1,0,24H64a12,12,0,0,1,0-24H95.35l40-120H112a12,12,0,0,1,0-24h80A12,12,0,0,1,204,56Z"/>',name:"text-italic",viewBox:"0 0 256 256"},f6={content:'<path d="M216,48H180V36A28,28,0,0,0,152,8H104A28,28,0,0,0,76,36V48H40a12,12,0,0,0,0,24h4V208a20,20,0,0,0,20,20H192a20,20,0,0,0,20-20V72h4a12,12,0,0,0,0-24ZM100,36a4,4,0,0,1,4-4h48a4,4,0,0,1,4,4V48H100Zm88,168H68V72H188ZM116,104v64a12,12,0,0,1-24,0V104a12,12,0,0,1,24,0Zm48,0v64a12,12,0,0,1-24,0V104a12,12,0,0,1,24,0Z"/>',name:"trash",viewBox:"0 0 256 256"},OW={content:'<path d="M228,144v64a12,12,0,0,1-12,12H40a12,12,0,0,1-12-12V144a12,12,0,0,1,24,0v52H204V144a12,12,0,0,1,24,0ZM96.49,80.49,116,61v83a12,12,0,0,0,24,0V61l19.51,19.52a12,12,0,1,0,17-17l-40-40a12,12,0,0,0-17,0l-40,40a12,12,0,1,0,17,17Z"/>',name:"upload-simple",viewBox:"0 0 256 256"},BW={content:'<path d="M234.38,210a123.36,123.36,0,0,0-60.78-53.23,76,76,0,1,0-91.2,0A123.36,123.36,0,0,0,21.62,210a12,12,0,1,0,20.77,12c18.12-31.32,50.12-50,85.61-50s67.49,18.69,85.61,50a12,12,0,0,0,20.77-12ZM76,96a52,52,0,1,1,52,52A52.06,52.06,0,0,1,76,96Z"/>',name:"user",viewBox:"0 0 256 256"},AW={content:'<path d="M128,20A108,108,0,1,0,236,128,108.12,108.12,0,0,0,128,20ZM79.57,196.57a60,60,0,0,1,96.86,0,83.72,83.72,0,0,1-96.86,0ZM100,120a28,28,0,1,1,28,28A28,28,0,0,1,100,120ZM194,179.94a83.48,83.48,0,0,0-29-23.42,52,52,0,1,0-74,0,83.48,83.48,0,0,0-29,23.42,84,84,0,1,1,131.9,0Z"/>',name:"user-circle",viewBox:"0 0 256 256"},DW={content:'<path d="M125.18,156.94a64,64,0,1,0-82.36,0,100.23,100.23,0,0,0-39.49,32,12,12,0,0,0,19.35,14.2,76,76,0,0,1,122.64,0,12,12,0,0,0,19.36-14.2A100.33,100.33,0,0,0,125.18,156.94ZM44,108a40,40,0,1,1,40,40A40,40,0,0,1,44,108Zm206.1,97.67a12,12,0,0,1-16.78-2.57A76.31,76.31,0,0,0,172,172a12,12,0,0,1,0-24,40,40,0,1,0-10.3-78.67,12,12,0,1,1-6.16-23.19,64,64,0,0,1,57.64,110.8,100.23,100.23,0,0,1,39.49,32A12,12,0,0,1,250.1,205.67Z"/>',name:"users",viewBox:"0 0 256 256"},PW={content:'<path d="M240.26,186.1,152.81,34.23h0a28.74,28.74,0,0,0-49.62,0L15.74,186.1a27.45,27.45,0,0,0,0,27.71A28.31,28.31,0,0,0,40.55,228h174.9a28.31,28.31,0,0,0,24.79-14.19A27.45,27.45,0,0,0,240.26,186.1Zm-20.8,15.7a4.46,4.46,0,0,1-4,2.2H40.55a4.46,4.46,0,0,1-4-2.2,3.56,3.56,0,0,1,0-3.73L124,46.2a4.77,4.77,0,0,1,8,0l87.44,151.87A3.56,3.56,0,0,1,219.46,201.8ZM116,136V104a12,12,0,0,1,24,0v32a12,12,0,0,1-24,0Zm28,40a16,16,0,1,1-16-16A16,16,0,0,1,144,176Z"/>',name:"warning",viewBox:"0 0 256 256"},j6={content:'<path d="M236.8,188.09,149.35,36.22h0a24.76,24.76,0,0,0-42.7,0L19.2,188.09a23.51,23.51,0,0,0,0,23.72A24.35,24.35,0,0,0,40.55,224h174.9a24.35,24.35,0,0,0,21.33-12.19A23.51,23.51,0,0,0,236.8,188.09ZM120,104a8,8,0,0,1,16,0v40a8,8,0,0,1-16,0Zm8,88a12,12,0,1,1,12-12A12,12,0,0,1,128,192Z"/>',name:"warning-fill",viewBox:"0 0 256 256"},B0={content:'<path d="M208.49,191.51a12,12,0,0,1-17,17L128,145,64.49,208.49a12,12,0,0,1-17-17L111,128,47.51,64.49a12,12,0,0,1,17-17L128,111l63.51-63.52a12,12,0,0,1,17,17L145,128Z"/>',name:"x",viewBox:"0 0 256 256"},_6={content:'<path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm37.66,130.34a8,8,0,0,1-11.32,11.32L128,139.31l-26.34,26.35a8,8,0,0,1-11.32-11.32L116.69,128,90.34,101.66a8,8,0,0,1,11.32-11.32L128,116.69l26.34-26.35a8,8,0,0,1,11.32,11.32L139.31,128Z"/>',name:"x-circle-fill",viewBox:"0 0 256 256"},IW={content:'<path d="M218.12,209.56l-61-95.8,59.72-65.69a12,12,0,0,0-17.76-16.14L143.81,92.77,106.12,33.56A12,12,0,0,0,96,28H48A12,12,0,0,0,37.88,46.44l61,95.8L39.12,207.93a12,12,0,1,0,17.76,16.14l55.31-60.84,37.69,59.21A12,12,0,0,0,160,228h48a12,12,0,0,0,10.12-18.44ZM166.59,204,69.86,52H89.41l96.73,152Z"/>',name:"x-logo",viewBox:"0 0 256 256"},NZ={[y5.name]:y5,[N3.name]:N3,[m5.name]:m5,[p5.name]:p5,[F6.name]:F6,[g5.name]:g5,[O3.name]:O3,[B3.name]:B3,[A3.name]:A3,[N6.name]:N6,[D3.name]:D3,[P3.name]:P3,[I3.name]:I3,[T3.name]:T3,[U3.name]:U3,[n5.name]:n5,[O6.name]:O6,[B6.name]:B6,[_0.name]:_0,[N0.name]:N0,[O0.name]:O0,[C3.name]:C3,[L3.name]:L3,[JJ.name]:JJ,[M3.name]:M3,[A6.name]:A6,[y8.name]:y8,[l5.name]:l5,[c5.name]:c5,[S3.name]:S3,[R3.name]:R3,[D6.name]:D6,[P6.name]:P6,[I6.name]:I6,[E3.name]:E3,[w3.name]:w3,[b3.name]:b3,[T6.name]:T6,[d5.name]:d5,[f3.name]:f3,[U6.name]:U6,[C6.name]:C6,[L6.name]:L6,[j3.name]:j3,[_3.name]:_3,[v3.name]:v3,[k3.name]:k3,[H3.name]:H3,[M6.name]:M6,[u3.name]:u3,[h3.name]:h3,[x3.name]:x3,[y3.name]:y3,[m3.name]:m3,[p3.name]:p3,[S6.name]:S6,[g3.name]:g3,[n3.name]:n3,[l3.name]:l3,[c3.name]:c3,[d3.name]:d3,[R6.name]:R6,[i5.name]:i5,[i3.name]:i3,[E7.name]:E7,[s3.name]:s3,[a3.name]:a3,[o3.name]:o3,[r3.name]:r3,[E6.name]:E6,[s5.name]:s5,[mJ.name]:mJ,[w7.name]:w7,[t3.name]:t3,[e3.name]:e3,[JW.name]:JW,[ZW.name]:ZW,[YW.name]:YW,[m8.name]:m8,[WW.name]:WW,[KW.name]:KW,[QW.name]:QW,[XW.name]:XW,[a5.name]:a5,[o5.name]:o5,[$W.name]:$W,[w6.name]:w6,[b6.name]:b6,[qW.name]:qW,[r5.name]:r5,[GW.name]:GW,[zW.name]:zW,[VW.name]:VW,[FW.name]:FW,[NW.name]:NW,[f6.name]:f6,[OW.name]:OW,[BW.name]:BW,[AW.name]:AW,[DW.name]:DW,[PW.name]:PW,[j6.name]:j6,[B0.name]:B0,[_6.name]:_6,[IW.name]:IW};var p8={danger:{icon:_6,label:"Error"},info:{icon:S6,label:"Information"},success:{icon:A6,label:"Success"},warning:{icon:j6,label:"Warning"}},t5=(W)=>W?p8[W]:void 0;var aG=/^(\d{4})-(\d{2})-(\d{2})$/,oG=/^(\d{2}):(\d{2})(?::(\d{2}(?:\.\d{1,3})?))?$/;var pJ=(W)=>{let J=aG.exec(W);if(!J)return null;let[Z,K,Q]=[Number(J[1]),Number(J[2]),Number(J[3])],Y=new Date(Date.UTC(Z,K-1,Q));return Y.getUTCFullYear()!==Z||Y.getUTCMonth()!==K-1||Y.getUTCDate()!==Q?null:Y},b7=(W)=>{if(!W||Number.isNaN(W.getTime()))return"";return W.toISOString().slice(0,10)},f7=(W)=>{let J=oG.exec(W);if(!J)return null;let[Z,K]=[Number(J[1]),Number(J[2])],Q=J[3]===void 0?0:Number(J[3]);if(Z>23||K>59||Q>=60)return null;return new Date(Date.UTC(1970,0,1,Z,K,Math.floor(Q),Q%1*1000))},j7=(W)=>{if(!W||Number.isNaN(W.getTime()))return"";let J=(W.getTime()%86400000+86400000)%86400000,Z=new Date(J),K=(X)=>String(X).padStart(2,"0"),Q=Z.getUTCSeconds()+Z.getUTCMilliseconds()/1000,Y=`${K(Z.getUTCHours())}:${K(Z.getUTCMinutes())}`;return Q===0?Y:`${Y}:${K(Z.getUTCSeconds())}`},e5=(W)=>W.trim()===""?Number.NaN:Number(W),J9=(W)=>Number.isNaN(W)?"":String(W);l4({"helix-accordion-item":["helix-before-close","helix-before-open","toggle"],"helix-announcement":["helix-dismiss"],"helix-app-header":["helix-scrolled"],"helix-avatar":["error","load"],"helix-carousel":["helix-select"],"helix-chat":["helix-before-pin"],"helix-chat-composer":["helix-send"],"helix-chat-message":["helix-send"],"helix-checkbox":["change","helix-before-toggle","input"],"helix-checkbox-group":["change","helix-before-change","input"],"helix-color-input":["change","helix-before-change","helix-before-close","helix-before-open","input","toggle"],"helix-color-picker":["change","helix-before-change","helix-copy","helix-sample-end","helix-sample-start","input"],"helix-combobox":["change","helix-before-change","helix-before-close","helix-before-open","helix-create","input","toggle"],"helix-command":["helix-before-close","helix-before-open","helix-select","toggle"],"helix-copy-button":["helix-copy"],"helix-data-table":["helix-filter","helix-navigate","helix-sort"],"helix-date-input":["change","helix-before-change","helix-before-close","helix-before-open","input","toggle"],"helix-date-picker":["change","helix-before-change","helix-navigate","input"],"helix-dialog":["close","helix-before-close","helix-before-open","toggle"],"helix-drawer":["close","helix-before-close","helix-before-open","toggle"],"helix-drilldown":["helix-select"],"helix-drilldown-item":["helix-select"],"helix-file-input":["change","helix-before-change","input"],"helix-heatmap":["helix-resize"],"helix-image":["error","load"],"helix-input":["change","helix-before-change","input"],"helix-kbd":["helix-shortcut"],"helix-listbox":["change","helix-before-change","helix-filter","input"],"helix-megamenu":["helix-before-close","helix-before-open","toggle"],"helix-menu":["helix-before-close","helix-before-open","helix-select","toggle"],"helix-menu-item":["helix-select"],"helix-notification":["helix-dismiss","helix-read"],"helix-notifications":["helix-read"],"helix-number-input":["change","helix-before-change","input"],"helix-option":["helix-select"],"helix-outline":["helix-before-activate"],"helix-pagination":["helix-navigate"],"helix-pagination-size":["helix-before-change"],"helix-pin-input":["change","helix-before-change","helix-complete","input"],"helix-popover":["helix-before-close","helix-before-open","toggle"],"helix-radio":["helix-select"],"helix-radio-group":["change","helix-before-change","input"],"helix-rating":["change","helix-before-change","input"],"helix-sandbox":["helix-before-panel-resize","helix-before-split"],"helix-sandbox-preview":["helix-console","helix-resize"],"helix-sandbox-source":["helix-before-edit","helix-caret"],"helix-select":["change","helix-before-change","helix-before-close","helix-before-open","input","toggle"],"helix-slider":["change","helix-before-change","input"],"helix-speed-dial":["helix-before-close","helix-before-open","toggle"],"helix-speed-dial-item":["helix-select"],"helix-splitter":["helix-before-collapse","helix-before-resize"],"helix-step":["helix-select"],"helix-steps":["helix-before-activate"],"helix-switch":["change","helix-before-toggle","input"],"helix-tab":["helix-select"],"helix-tabs":["helix-before-activate","helix-select"],"helix-tag":["helix-dismiss"],"helix-textarea":["change","helix-before-change","input"],"helix-time-input":["change","helix-before-change","helix-before-close","helix-before-open","input","toggle"],"helix-time-picker":["change","helix-before-change","input"],"helix-toast-item":["helix-dismiss"],"helix-toggle":["helix-select"],"helix-toggle-group":["change","helix-before-change","helix-select","input"],"helix-tooltip":["helix-before-close","helix-before-open","toggle"],"helix-tour":["helix-before-activate","helix-before-close","helix-complete","toggle"],"helix-tour-stop":["helix-tour-ask"],"helix-tree":["helix-before-activate","helix-select"],"helix-tree-item":["helix-before-close","helix-before-open","helix-select","toggle"],"helix-video":["ended","helix-next","helix-previous","pause","play"],"helix-video-playlist":["helix-before-activate"],"helix-video-playlist-item":["helix-select"],"helix-video-playlist-menu":["helix-select"]});var TW=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},rG=new Set(["ArrowDown","ArrowUp","Home","End"]),_7=class W extends A{constructor(){super(...arguments);this.handleKeydown=(J)=>{if(!rG.has(J.key))return;let Z=this.items,K=Z.indexOf(J.target);if(K===-1)return;let Q=Z.length-1,Y=K;if(J.key==="ArrowDown")Y=K===Q?0:K+1;else if(J.key==="ArrowUp")Y=K===0?Q:K-1;else if(J.key==="Home")Y=0;else Y=Q;J.preventDefault(),Z[Y]?.focusTrigger()}}get items(){return[...this.children].filter((J)=>J instanceof gJ)}connectedCallback(){super.connectedCallback(),this.addEventListener("keydown",this.handleKeydown)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("keydown",this.handleKeydown)}render(){return F`<slot></slot>`}};TW([q({reflect:!0})],_7.prototype,"mode",void 0);_7=TW([G("helix-headless-accordion")],_7);var BZ=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},UW="content",OZ="trigger",gJ=class W extends g(A){constructor(){super(...arguments);this.handleToggle=()=>{let J=!this.open,Z=this.accordion?.mode;if(!J&&Z==="single")return;if(!this.requestOpen(J))return;if(J&&(Z!==void 0||this.name!==void 0&&this.name!=="")){for(let K of this.peers)if(K!==this&&K.open)K.requestOpen(!1)}}}renderChevron(){if(this.chevronPlacement==="none")return z;return F`<svg part="chevron" fill="currentColor" viewBox=${_0.viewBox} aria-hidden="true">
      ${S(_0.content)}
    </svg>`}get accordion(){return h1(this,_7)}get peers(){if(this.name!==void 0&&this.name!=="")return[...this.getRootNode().querySelectorAll(`${this.localName}[name="${CSS.escape(this.name)}"]`)];let J=this.accordion;if(!J||J.items.indexOf(this)===-1)return[];return J.items}focusTrigger(){this.renderRoot.querySelector(`#${OZ}`)?.focus()}render(){let J=this.open;return F`
      <div part="container">
        <button
          id=${OZ}
          aria-controls=${UW}
          aria-expanded=${J?"true":"false"}
          part="trigger"
          type="button"
          @click=${this.handleToggle}
        >
          ${this.chevronPlacement==="start"?this.renderChevron():z}
          <slot name="summary"></slot>
          ${this.chevronPlacement==="start"?z:this.renderChevron()}
        </button>
        <div
          id=${UW}
          aria-labelledby=${OZ}
          part="content"
          ?hidden=${!J}
          ?inert=${!J}
          role="region"
        >
          <div part="content-inner">
            <slot></slot>
          </div>
        </div>
      </div>
    `}};BZ([q({attribute:"chevron-placement",reflect:!0})],gJ.prototype,"chevronPlacement",void 0);BZ([q({reflect:!0})],gJ.prototype,"name",void 0);gJ=BZ([G("helix-headless-accordion-item")],gJ);var CW=N(`:host {
display: block;
}

[part="trigger"] {
all: unset;

box-sizing: border-box;
align-items: center;
color: var(--helix-color-foreground);
cursor: pointer;
display: flex;
font-size: var(--helix-text-md);
font-weight: var(--helix-weight-medium);
inline-size: 100%;

gap: var(--helix-space-xs);

min-block-size: var(--helix-size-control);
padding: var(--accordion-item-padding, var(--helix-space-sm) var(--helix-space-md));
transition: background-color var(--helix-duration-fast) var(--helix-easing-standard);
}

[part="chevron"] {
block-size: 1em;
color: var(--helix-color-foreground-subtle);
flex: 0 0 auto;
inline-size: 1em;
transform: scaleY(1);
transition: transform var(--helix-duration-fast) var(--helix-easing-standard);
}

:host(:not([chevron-placement="start"])) [part="chevron"] {
margin-inline-start: auto;
}

:host(:state(open)) [part="chevron"] {
transform: scaleY(-1);
}

@media (prefers-reduced-motion: reduce) {
[part="chevron"] {
transition: none;
}
}

[part="trigger"]:hover [part="chevron"] {
color: var(--helix-color-foreground);
}

[part="trigger"]:focus-visible {
outline: var(--helix-size-focus-ring) solid var(--helix-color-focus-ring);
outline-offset: calc(var(--helix-size-focus-offset) * -1);
}

[part="content"] {
display: grid;
grid-template-rows: 0fr;
transition: grid-template-rows var(--helix-duration-normal) var(--helix-easing-standard);
}

:host(:state(open)) [part="content"] {
grid-template-rows: 1fr;
}

[part="content-inner"] {

min-block-size: 0;
overflow: hidden;
}

[part="content-inner"] > slot {
color: var(--helix-color-foreground-muted);
display: block;
line-height: var(--helix-leading-normal);
padding: var(--accordion-item-padding, var(--helix-space-sm) var(--helix-space-md));
padding-block-start: 0;
}

@media (prefers-reduced-motion: reduce) {
[part="content"] {
transition: none;
}
}

@media (prefers-reduced-motion: reduce) {
[part="trigger"] {
transition: none;
}
}`);var tG=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},LW=class W extends gJ{static{this.styles=CW}};LW=tG([G("helix-accordion-item")],LW);var MW=N(`:host {
display: block;
}

:host([separation="outlined"]) {
border: var(--helix-border-thin) solid var(--accordion-border-color, var(--helix-color-border));

border-radius: var(--accordion-radii, var(--helix-radii-sm));

overflow: hidden;
}

::slotted(* + *) {
border-block-start: var(--helix-border-thin) solid
var(--accordion-border-color, var(--helix-color-border));
}

@media print {
:host {
background-color: transparent;
box-shadow: none;
}
}`);var SW=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},AZ=class W extends _7{static{this.styles=MW}};SW([q({reflect:!0})],AZ.prototype,"separation",void 0);AZ=SW([G("helix-accordion")],AZ);var RW=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},Z9=class W extends T7(A){willUpdate(J){super.willUpdate(J),L(this.internals,{role:"status"}),this.internals.ariaLive="polite"}updated(J){super.updated(J),this.markEmpty()}markEmpty(){let J=this.renderRoot?.querySelector('[part="actions"]'),Z=!o(this.renderRoot?.querySelector('slot[name="actions"]'));J?.toggleAttribute("data-empty",Z),J?.toggleAttribute("hidden",Z)}renderDismissIcon(){return F`<slot name="icon">
      <svg part="dismiss-mark" viewBox=${B0.viewBox} fill="currentColor" aria-hidden="true">
        ${S(B0.content)}
      </svg>
    </slot>`}render(){return F`<div part="content"><slot></slot></div>
      <div part="actions"><slot name="actions"></slot></div>
      ${this.dismissible?F`<button
              part="dismiss"
              type="button"
              aria-label=${this.dismissLabel}
              @click=${()=>this.dismiss()}
            >
              ${this.renderDismissIcon()}
            </button>`:z}`}};RW([q({reflect:!0})],Z9.prototype,"tone",void 0);Z9=RW([G("helix-headless-announcement")],Z9);var EW=N(`:host {

--helix-size-icon: var(--helix-size-icon-sm);
--helix-size-control: var(--helix-size-control-sm);

--_announcement-color: var(--helix-color-foreground-muted);

align-items: center;
background-color: var(--helix-color-surface-sunken);

border-block-end: var(--helix-border-thin) solid var(--helix-color-border);
color: var(--helix-color-foreground);
display: flex;
font-size: var(--helix-text-sm);

font-weight: var(--helix-weight-medium);
inline-size: 100%;
padding-block: var(--helix-space-xs);
padding-inline: var(--announcement-inset, var(--helix-space-lg));

position: relative;
}

:host([tone="info"]) {
--_announcement-color: var(--helix-color-info);
}

:host([tone="success"]) {
--_announcement-color: var(--helix-color-success);
}

:host([tone="warning"]) {
--_announcement-color: var(--helix-color-warning);
}

:host([tone="danger"]) {
--_announcement-color: var(--helix-color-danger);
}

:host([tone="neutral"]) {
background-image: none;
border-block-end-color: var(--helix-color-border);
}

:host([tone="surface"]) {
background-color: var(--helix-color-surface);
background-image: none;
border-block-end-color: var(--helix-color-border);
}

:host([tone="primary"]) {
--_announcement-color: var(--helix-color-primary);
}

:host([tone]:not([tone="neutral"], [tone="surface"])) {
background-image: linear-gradient(
to right,
light-dark(
color-mix(in oklab, var(--_announcement-color) 18%, var(--helix-color-background)),
color-mix(in oklab, var(--_announcement-color) 32%, var(--helix-color-background))
),
light-dark(
color-mix(in oklab, var(--_announcement-color) 10%, var(--helix-color-background)),
color-mix(in oklab, var(--_announcement-color) 20%, var(--helix-color-background))
)
);
border-block-end-color: color-mix(
in oklab,
var(--_announcement-color) 40%,
var(--helix-color-background)
);
}

[part="content"] {
flex: 1 1 auto;
min-inline-size: 0;
text-align: center;
}

[part="actions"] slot::slotted(*) {
margin-inline-start: var(--helix-space-md);
}

[part="actions"] {
align-items: center;
display: flex;
flex: 0 0 auto;
gap: var(--helix-space-xs);
}

[part="dismiss"] {
all: unset;

box-sizing: border-box;

block-size: calc(var(--helix-size-icon) + var(--helix-space-2xs) * 2);
inline-size: calc(var(--helix-size-icon) + var(--helix-space-2xs) * 2);
border-radius: var(--helix-radii-sm);
color: var(--helix-color-foreground-muted);
cursor: pointer;
display: inline-flex;
flex: 0 0 auto;
place-content: center;
place-items: center;

position: absolute;
inset-inline-end: var(--announcement-inset, var(--helix-space-lg));
transition:
background-color var(--helix-duration-fast) var(--helix-easing-standard),
color var(--helix-duration-fast) var(--helix-easing-standard);
}

[part="dismiss"]:hover {
background-color: color-mix(in oklab, var(--helix-color-foreground) 8%, transparent);
color: var(--helix-color-foreground);
}

[part="dismiss"] svg {
block-size: var(--helix-size-icon);
inline-size: var(--helix-size-icon);
}

[part="dismiss"]:focus-visible {
outline: var(--helix-size-focus-ring) solid var(--helix-color-focus-ring);
outline-offset: var(--helix-size-focus-offset);
}

@media (prefers-reduced-motion: reduce) {
[part="dismiss"] {
transition: none;
}
}

[part="actions"][data-empty] {
display: none;
}

@media print {
:host {
background-color: transparent;
box-shadow: none;
}
}`);var eG=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},wW=class W extends Z9{static{this.styles=EW}};wW=eG([G("helix-announcement")],wW);var bW=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},Y9=class W extends A{constructor(){super(...arguments);this.scrolled=!1,this.handleScroll=()=>{let J=window.scrollY,Z=this.scrolled?J>2:J>8;if(Z===this.scrolled)return;if(this.scrolled=Z,Z)this.internals.states.add("scrolled");else this.internals.states.delete("scrolled");this.dispatchEvent(new C8({scrolled:Z}))}}willUpdate(J){super.willUpdate(J),L(this.internals,{role:"banner"})}connectedCallback(){super.connectedCallback(),window.addEventListener("scroll",this.handleScroll,{passive:!0}),this.handleScroll()}disconnectedCallback(){super.disconnectedCallback(),window.removeEventListener("scroll",this.handleScroll)}render(){return F`
      <div part="row">
        <div part="start"><slot name="start"></slot></div>
        <div part="content"><slot></slot></div>
        <div part="end"><slot name="end"></slot></div>
      </div>
    `}};bW([q({attribute:"content-align",reflect:!0})],Y9.prototype,"contentAlign",void 0);Y9=bW([G("helix-headless-app-header")],Y9);var fW=N(`:host {

--helix-size-checkbox: var(--helix-size-checkbox-sm);

--helix-size-icon: var(--helix-size-icon-sm);
--helix-size-control: var(--helix-size-control-sm);
--helix-size-tag: var(--helix-size-tag-sm);

background-color: var(--app-header-background, var(--helix-color-background));
border-block-end: var(--helix-border-thin) solid var(--app-header-border-color, transparent);
display: block;
inline-size: 100%;

transition:
backdrop-filter var(--helix-duration-normal) var(--helix-easing-standard),
background-color var(--helix-duration-normal) var(--helix-easing-standard),
border-color var(--helix-duration-normal) var(--helix-easing-standard);
}

:host([material="glass"]) {
backdrop-filter: var(--app-header-backdrop, var(--helix-material-backdrop));
background-color: var(--app-header-background, var(--helix-material-translucent));
}

:host([material="frosted"]) {
backdrop-filter: var(--app-header-backdrop, blur(var(--helix-material-blur-lg)));
background-color: var(--app-header-background, var(--helix-material-translucent-strong));
}

:host([material="transparent"]) {
background-color: var(--app-header-background, transparent);
}

:host([material="transparent"]:state(scrolled)) {
backdrop-filter: var(--app-header-backdrop, var(--helix-material-backdrop));
background-color: var(--app-header-background, var(--helix-material-translucent));
}

:host([sticky]) {
inset-block-start: 0;
position: sticky;
z-index: var(--helix-layer-sticky);
}

[part="row"] {
align-items: center;
block-size: var(--app-header-height, var(--helix-size-header));
display: grid;
gap: var(--helix-space-lg);
grid-template-columns: 1fr auto 1fr;
margin-inline: auto;
max-inline-size: var(--app-header-max-inline-size, 72rem);
padding-inline: var(--app-header-inset, var(--helix-space-lg));
}

[part="start"] {
align-items: center;
display: flex;
min-inline-size: 0;
}

[part="end"] {
align-items: center;
display: flex;
gap: var(--helix-space-xs);
justify-content: flex-end;
min-inline-size: 0;
}

:host([content-align="start"]) [part="row"] {
grid-template-columns: auto 1fr auto;
}

slot[name="start"]::slotted(*) {
align-items: center;
color: var(--helix-color-foreground);
display: flex;
flex: 0 0 auto;
font-weight: var(--helix-weight-semibold);
gap: var(--helix-space-xs);
letter-spacing: var(--helix-tracking-tight);
}

[part="content"] {
align-items: center;
display: flex;

position: relative;
gap: var(--helix-space-md);
justify-content: center;

min-inline-size: 0;
overflow-x: auto;
}

:host([content-align="start"]) [part="content"] {
justify-content: flex-start;
}

@media (prefers-reduced-motion: reduce) {
:host {
transition: none;
}
}

@media print {
:host {
display: none;
}
}`);var DZ=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},v6=class W extends Y9{constructor(){super(...arguments);this.sticky=!1}static{this.styles=fW}};DZ([q({reflect:!0})],v6.prototype,"material",void 0);DZ([q({reflect:!0,type:Boolean})],v6.prototype,"sticky",void 0);v6=DZ([G("helix-app-header")],v6);var Jz=Math.PI/180;var jW=(W,J)=>Math.atan(2*(W-0.5)*J*J)/Jz;var _W=N(`:host {
position: relative;
display: block;
inline-size: 100%;
block-size: 100%;

background-image: radial-gradient(
120% 90% at 62% 12%,
color-mix(in oklab, var(--helix-color-primary) 38%, var(--helix-color-background)) 0%,
var(--helix-color-primary-subtle) 38%,
var(--helix-color-background) 78%
);
}

:host {
pointer-events: none;
}

:host([interactive]) {
pointer-events: auto;
}

[part="canvas"] {
display: block;
inline-size: 100%;
block-size: 100%;
}

@media print {
:host {
display: none;
}
}`);var vW=["braid","rays","aurora","streaks","waves","threads","particles","flow","caustics","lattice","fracture"],kW=["native","light","shadow","ripple","none"],HW=`#version 300 es
  out vec2 uv;
  void main() {
    vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
    uv = p;
    gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
  }
`,uW=`#version 300 es
  precision highp float;

  in vec2 uv;
  out vec4 color;

  uniform vec2 uResolution;
  uniform float uTime;
  uniform int uShape;
  uniform vec2 uPointer;
  uniform float uReach;
  uniform int uInteraction;
  uniform float uTilt;
  uniform float uScale;
  uniform float uBloom;
  uniform float uGain;

  /* How much the members of a population differ from one another, 1 being the
     resting amount and 0 a set that is uniform. Read by the shapes made of many
     similar things, whether those are counted or continuous: streaks has lanes,
     particles has motes, rays has a fan, and aurora has bundles and folds. Braid, waves and flow have a single subject and nothing to vary.
     Threads is the deliberate exception, being even on purpose: a pass had
     already given its strands their own hashes and produced a scatter rather
     than a set. */
  uniform float uVariance;
  /* Where the pointer has been, as x, y and age. Age runs 0 at the moment it
     was left to 1 when it has faded, so a spent slot costs a compare.

     **This is what a fluid gets from a framebuffer, bought for eight vec3s.** A
     real solver advects a dye texture and reads it back the next frame, which
     needs render targets, a ping-pong pair and about six passes. What a reader
     actually perceives from that is one thing: the cursor leaves a wake that
     outlives it. A short history of where it went reproduces that in the single
     pass this component already makes, at a fixed cost that does not grow with
     how long the page has been open. What it cannot do is conserve anything, so
     there is no diffusion and no pressure: the wake decays rather than
     spreading. Worth knowing before this is asked to be a simulation. */
  uniform vec3 uTrail[9];
  uniform vec3 uGround;
  uniform vec3 uHaze;
  uniform vec3 uGlow;
  uniform vec3 uPeak;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    /* Quintic rather than cubic. Cubic smoothstep leaves a second derivative
       discontinuity at every cell edge, which four octaves of lighting turn
       into a faint square lattice: visible on a large soft field and exactly
       the artifact that reads as cheap. */
    vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  /* Each octave is rotated as well as scaled. Doubling alone stacks every
     octave on the same axes, so value noise keeps its grid however many are
     summed. An irrational angle means no two octaves ever line up again. */
  const mat2 TURN = mat2(0.8, 0.6, -0.6, 0.8);

  float fbm(vec2 p) {
    float sum = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 5; i++) {
      sum += amp * noise(p);
      p = TURN * p * 2.03;
      amp *= 0.5;
    }
    return sum;
  }

  /* Domain warping: the field is sampled at coordinates another field bends.
     This is the single largest difference between noise that reads as organic
     and noise that reads as television static, and it costs two more fbm calls
     rather than a different algorithm. */
  float warped(vec2 p, float t) {
    vec2 q = vec2(fbm(p + vec2(0.0, t)), fbm(p + vec2(5.2, 1.3 - t)));
    vec2 r = vec2(fbm(p + 4.0 * q + vec2(1.7, 9.2)), fbm(p + 4.0 * q + vec2(8.3, 2.8)));
    return fbm(p + 4.0 * r);
  }

  /* An exponential falloff without the corner.
   *
   * Both abs and length have a vertex at zero and their derivative jumps
   * across it, so a falloff built on either acquires a hard line exactly along
   * the axis it is brightest on. That is a crease in something meant to be
   * light, and it is what put a chevron through the braid wherever the
   * pointer's height crossed a strand.
   *
   * Softening the distance rather than the exponent keeps the tails identical
   * and rounds only the point. The softening scales with the rate, so a tight
   * falloff is rounded tightly and a broad one broadly: at zero the result is
   * exp(-0.06) whatever the rate is, six per cent off the peak, which is not
   * visible as flattening.
   *
   * Takes the squared distance, because every caller already has one and a
   * square root taken here is the one that would have reintroduced the vertex.
   */
  float falloff(float d2, float k) {
    float soft = 0.06 / k;
    return exp(-sqrt(d2 + soft * soft) * k);
  }

  /* Two strands half a turn apart, inside a wider volume. */
  float braid(vec2 q, float t, vec2 qp, float reach) {
    /* The strands lean toward the pointer where it is alongside them, and are
       unmoved where it is not. A braid is a thing with a length, so what it can
       answer with is a bend at a height, not a bulge at a point. */
    float alongside = falloff((q.y - qp.y) * (q.y - qp.y), 1.1) * reach;
    float lean = qp.x * alongside * 0.45;
    float lit = 0.0;
    for (int i = 0; i < 2; i++) {
      float phase = float(i) * 3.14159265;
      float x = q.x - lean - 0.34 * sin(q.y * 1.6 + t * 1.4 + phase);
      lit += 0.8 * falloff(x * x, 13.0);
    }
    float volume = falloff(q.x * q.x, 2.6);
    /* Compressed hard across the shaft and stretched along it. The same octaves
       sampled square read as haze; this way they read as filaments. */
    float streak = fbm(vec2(q.x * 9.0, q.y * 0.55 - t * 2.4));
    float haze = warped(vec2(q.x * 0.8 + 4.0, q.y * 0.45), t * 0.5);
    return lit * mix(0.35, 1.65, streak) + volume * 0.3 * mix(0.35, 1.05, haze);
  }

  /* A fan from a source above the frame, cut into filaments by angle. */
  float rays(vec2 q, float t, vec2 qp, float reach) {
    /* The pointer occludes, rather than the source moving.
    
       Swinging the source re-aimed the whole fan, which is a thing a light does
       and not a thing that happens when something passes in front of one. What
       a reader knows about rays is that an object crossing them takes a bite
       out of the light and drags a shadow behind itself, away from the source.
       So the source is fixed and the pointer is a blocker.
    
       The shadow is angular, not radial: it is the wedge of directions the
       object covers as seen from the source, and it only exists further along
       than the object is. A fragment nearer the source than the blocker is in
       front of it and stays lit, which is the whole difference between an
       occluder and a dark patch that follows the cursor. */
    vec2 o = vec2(0.0, 1.45);
    vec2 v = q - o;
    float dist = length(v);
    float ang = atan(v.x, -v.y);

    vec2 vp = qp - o;
    float distToBlocker = length(vp);
    float angToBlocker = atan(vp.x, -vp.y);
    /* Widened with distance, so the object reads as a fixed size rather than
       as a wedge that grows the further out it is carried. */
    float halfAngle = 0.055 / max(distToBlocker, 0.35);
    float across = (ang - angToBlocker) / halfAngle;
    /* Cast from the near edge of the object rather than from somewhere past it.
       Ramping in over a fifth of a unit started the shadow below the thing
       supposedly casting it, which reads as two objects. */
    float behind = smoothstep(-0.03, 0.05, dist - distToBlocker);
    float shadow = exp(-across * across) * behind * reach;

    float fan = fbm(vec2(ang * 8.0, dist * 0.5 - t * 1.8));
    float dust = warped(vec2(ang * 2.0, dist * 0.7), t * 0.4);
    float spread = smoothstep(0.85, 0.05, abs(ang));
    /* The fan is a population too, even though it is continuous rather than
       counted: how far apart its light and dark run is how much one ray differs
       from the next. Both ends travel toward the midpoint, so a variance of 0
       is an even wash and a variance of 1 is exactly the pair this always had. */
    float rv = clamp(uVariance, 0.0, 1.0);
    float lit = spread * mix(mix(0.85, 0.2, rv), mix(0.85, 1.5, rv), fan) *
      mix(0.75, 1.15, dust) * falloff(dot(v, v), 0.8);
    return lit * (1.0 - shadow * 0.82);
  }

  /* Curtains on a drifting horizon. */
  float aurora(vec2 q, float t, vec2 qp, float reach) {
    /* The curtain waves harder where the pointer is, rather than being lifted
       by it. An aurora is a sheet with an amplitude, and a swell only raised
       the whole thing locally, which is a bump in a line. Multiplying the
       amplitude bends it instead: the folds deepen and the ridge travels
       further, which is what an aurora does when it is disturbed. */
    float agitate = falloff((q.x - qp.x) * (q.x - qp.x), 1.5) * reach;

    /* A curtain stands. It does not hang.
    
       This was a falloff symmetric about the ridge, which is a band with a
       wavy center line, and a band with vertical noise on it is an equaliser.
       An aurora has a sharp lower border where the field lines reach their
       lowest, and light that thins upward from it, so the top and the bottom
       cannot be the same function. Cut hard below, drawn long above.
    
       Two of them, offset and at different depths, because a single sheet reads
       as a decal and what makes the real thing look like drapery is one curtain
       seen through another. */
    float lit = 0.0;
    for (int i = 0; i < 2; i++) {
      float f = float(i);
      /* Two octaves, not a warp. A warp folds the domain back on itself and
         puts high frequencies in the ridge, and against a hard top edge every
         wiggle becomes a spike: the first pass came out a mountain range. What
         an aurora has is a long undulation with a few folds in it, which is
         what a low fundamental and one overtone give. */
      float ridge =
        ((noise(vec2(q.x * (0.55 + f * 0.2) + f * 4.0, t * 0.3)) - 0.5) * 1.7 +
          (noise(vec2(q.x * (1.3 + f * 0.4) + f * 9.0, t * 0.45)) - 0.5) * 0.55) *
          (1.0 + agitate * 2.0) +
        f * 0.22;
      /* **The sheet stands on the ridge rather than hanging from it, and that
         inversion is the whole difference between an aurora and a landscape.**
         A hard edge with mass under it is a mountain silhouette, which is
         exactly what this drew: one unbroken ridge line across the frame with a
         striped solid below it. The real thing is the other way up. A curtain's
         lower border is its sharpest, brightest line, and what rises from it
         thins and breaks into rays. Nothing else here had to change. */
      float depth = q.y - ridge;
      /* Sharp, but not a cliff: the edge is where the light stops, and a step
         narrower than a pixel is an aliased line rather than an edge. */
      /* **The border's sharpness varies along it.** One constant made one
         continuously crisp line across the whole curtain, and a line of even
         weight reads as drawn rather than lit however it wanders. A real lower
         border is hard where the
         sheet faces us and diffuse where it turns away, so the crispness is
         drawn from the same slow noise the folds are. */
      float crisp = mix(0.04, 0.3, noise(vec2(q.x * 0.8 + f * 5.0, t * 0.15)));
      float edge = smoothstep(-crisp, crisp * 0.5, depth);
      /* Steeper, so the curtain thins instead of filling everything above the
         border. At 1.5 it still stood at a fifth a whole unit up, which with
         the bundles over it painted a solid wall of stripes from the border to
         the top of the frame: the dark under a hard line then read as a hill
         and the light over it as rain. A curtain is mostly the bottom of a
         curtain. */
      float rise = exp(-max(depth, 0.0) * (2.9 + f * 1.1));
      /* Stretched hard along the fall, so the striations are the vertical rays
         a curtain is actually made of rather than texture on a stripe. */
      /* 0.9 along the fall, not 0.35. Stretched that hard the rays held one
         value for their whole length, which is a picket fence however the
         bundles are shaped: what varies along a ray is the thing that makes it
         look like moving light rather than a printed stripe. */
      float rays = fbm(vec2(q.x * (9.0 + f * 4.0), q.y * 0.9 - t * (2.2 + f)));

      /* A rim along the top edge. The brightest part of a curtain is the line
         where the field lines end, and without it the sheet fades in from
         nothing and reads as fog with stripes rather than as something with a
         boundary. Wide enough to see: at k = 26 this was two pixels and might
         as well not have been there. */
      float rim = falloff(depth * depth, 7.0) * 0.45;

      /* **A curtain is not the width of the sky.** Running edge to edge is what
         made the ridge read as a horizon: a horizon is continuous and a curtain
         is not. Broken into lengths by a slow mask, with real gaps between
         them, it becomes some number of curtains rather than one long one. */
      float lengths = smoothstep(0.2, 0.66, noise(vec2(q.x * 1.15 + f * 13.0, t * 0.12)));

      /* Rays clump. Straight fbm is evenly spaced striping, which is a picket
         fence whatever else is done to it, and the floor under it lit the sheet
         everywhere so the rays only ever read as texture on a solid band.
         Pushing the midtones apart leaves bright bundles with real gaps
         between them, and the low floor is what lets the gaps be gaps. */
      float bundles = smoothstep(0.34, 0.86, rays);

      /* The curtain is a draped sheet, so it is bright where a fold turns edge
         on and nearly out where it faces us. A narrow range here is a band of
         even brightness, which is the other half of what made it read flat. */
      float foldNoise = noise(vec2(q.x * 1.5 + f * 7.0, t * 0.25));

      /* Bundles and folds are what a curtain is made many of, so both answer
         variance about their own midpoint: at 0 an even sheet, at 1 the
         clumping and the deep folds this was tuned to. */
      float av = clamp(uVariance, 0.0, 1.0);
      float bundled = mix(mix(0.85, 0.1, av), mix(0.85, 1.6, av), bundles);
      float folded = mix(mix(0.775, 0.15, av), mix(0.775, 1.4, av), foldNoise);
      lit += edge * lengths * (rise * bundled * folded + rim) * (1.0 - f * 0.45);
    }
    return lit;
  }

  /* Light traveling in lanes, at speed.
   *
   * The one shape here that is about motion rather than about a form. Each lane
   * carries a trail with its own speed, length and phase, so the field reads as
   * something passing rather than something standing: the streaks the earlier
   * ground plane wanted and never got.
   *
   * The wrap is deliberately outside the frame. A trail restarting is a pop, so
   * the travel runs to plus and minus 1.8 while the visible field ends nearer
   * 1.2, and the reset happens where nobody is looking.
   *
   * The pointer is an obstacle: lanes bow around it and slow through it, the way
   * anything moving past a body does. Pushed outward in proportion to the offset
   * rather than by its sign, because a sign is a discontinuity and a
   * discontinuity in a displacement is a crease.
   */
  float streaks(vec2 q, float t, vec2 qp, float reach) {
    float near = falloff(dot(q - qp, q - qp), 1.6) * reach;
    vec2 s = q + vec2((q.x - qp.x) * near * 1.1, 0.0);

    /* Three lanes are visited, not one, and that is the fix for a square edge.
    
       Each lane draws its speed, phase and length from a hash of its index, so
       every one of them is at a different point in its cycle. Sampled from the
       single lane a fragment falls in, the whole strip changes state at the
       boundary and the field acquires a hard vertical line at every lane edge:
       measured at 23 straight edges across the frame, and at a tilt of 90 the
       same count arrives horizontal, which is what says they belong to the
       shape's own axes rather than to the screen.
    
       Visiting the neighbours and weighting each by its own distance is the
       same answer particles already uses for the same reason. The weight
       reaches zero between centres, so nothing is left to step. */
    /* **Fewer lanes, and not all of them carry anything.** At 2.4 a frame held
       a dozen streaks at once and read as rain: a streak is an event, and a
       field of simultaneous events is a texture. Sixteen hundredths of the
       lanes and a little over half of those alive puts the count at about
       two fifths of what it was.
    
       A dead lane contributes nothing anywhere rather than being cut off
       somewhere, so it costs the three lane blend nothing. */
    float laneF = s.x * 1.6;
    float base = floor(laneF);

    float lit = 0.0;
    /* Three lanes, which is what the widths support. The tail spreads to at
       most 0.15 and lanes sit 0.417 apart, so one lane out carries about a
       fiftieth and the lane that drops out of the visited set, two out, is
       around a ten millionth. That dropped lane is where a step could appear,
       and it is the whole reason this loop is not a single lane. */
    for (int k = -1; k <= 1; k++) {
      float id = base + float(k);
      float within = laneF - (id + 0.5);

      /* Speed and length were already drawn per lane, and measure a little over
         four times and seventy times across a frame. What was not drawn was
         width, which came out flat at 47 to 53 pixels on every lane, so a set
         that moved variously was still a set of identical objects.
    
         All four now scale from a common resting value, so a variance of 0 is a
         rank of equal streaks at one speed rather than a special case. Phase is
         never scaled: lanes sharing a phase march in lockstep, which is not a
         uniform population but a broken one. */
      /* Clamped, and the upper half of that is not defensive tidying. These
         are mix() calls, so a value past 1 extrapolates rather than
         exaggerating: at 1.6 the length term reaches zero and beyond it goes
         negative, which makes exp(-behind / len) grow instead of decay and the
         lane becomes a full-height white bar. Measured at 2, the frame held 93
         apparent lanes and six straight edges. There is nothing above 1 worth
         reaching, the resting spread already being fourfold in speed. */
      float v = clamp(uVariance, 0.0, 1.0);
      float alive = step(0.42, hash(vec2(id, 97.0)));
      float speed = mix(1.3, 0.55 + hash(vec2(id, 11.0)) * 1.5, v);
      float phase = hash(vec2(id, 29.0));
      /* Longer than they were. At 0.3 to 1.3 the tail was spent within about
         half the gap and each streak read as a blob with a smudge behind it;
         the thing is named for the trail, so the trail is the part that should
         dominate the head. */
      /* Shorter than it was. A plume that stays bright for two and a half
         units is a searchlight: the frame is two units tall. */
      float len = mix(0.85, 0.5 + hash(vec2(id, 47.0)) * 0.8, v);

      /* **The lane is periodic, not a single streak that is put back when it
         runs out.** It was fract() over a fixed span of 3.6, so a head left the
         top at 1.8 and was moved to -1.8, taking whatever of its tail was still
         on screen with it. That span is only off screen while the frame is
         small enough to sit inside it, and the visible half-extent is
         (|sin tilt| * aspect + |cos tilt|) * scale, which reaches 1.97 at a
         tilt of 45 and 2.0 at a scale of 2. Past that the removal happens in
         plain view, which is the popping.
    
         Making the field periodic in y removes the event rather than moving it
         out of sight: heads sit at every integer of u and the whole rank slides
         through, so there is no frame in which one is created or destroyed and
         no scale or tilt at which that becomes visible.
    
         P is the gap between successive heads in a lane, and it is what density
         is now made of. It varies too: lanes that are alike in spacing read as
         a grid however much else about them differs. */
      /* Wider spacing, because the tails are longer: at the old gap a streak's
         tail reached the next one's nose and the lane read as a dashed line
         rather than as separate things traveling. */
      float gap = mix(4.2, 3.2 + hash(vec2(id, 59.0)) * 2.2, v);
      float travel = phase + t * speed * 1.8 / gap;
      float u = s.y / gap - travel;
      float w = fract(u);
      /* **A streak is one solid, not a brightness curve times a fixed width.**
         Drawn separably it is a dart, and that is what these were: along the
         lane the light stopped over a fifth of a unit, across it the lane kept
         its full width the whole way, and the level sets of such a product meet
         at a point. Straight edges and an apex, which is a paper dart.
    
         So each term carries its own width. The tail leaves the head narrow and
         spreads as it falls behind, and the front is a round cap rather than a
         full-width wall cut off across the lane. Together that is a teardrop,
         which is the silhouette the thing actually has. */
      float across = within / 1.6;
      /* 0.06, which is what the profile it replaces actually measured. Lanes
         sit 0.417 apart and the old exp(-|within| * 4) was half-height at 0.072
         of a lane, so a sigma of 0.15 was two and a half times too wide: every
         lane overlapped both neighbours and the frame came out a blue wash with
         no streaks in it at all. */
      /* Thinner, and paired with the longer tail below. Length against width is
         what makes a streak read as a streak: at a ratio near four these were
         stubby rods with rounded ends whichever way they tapered, and the fix
         for that is proportion rather than another change of profile. */
      float wide = mix(0.045, 0.03 + hash(vec2(id, 71.0)) * 0.04, v);

      /* **A comet is a nucleus with a coma, and a plume behind it.** Neither of
         the two shapes this has been was that. A round cap the width of the
         body with the body widening behind it drew a bulb on a shaft; tapering
         the front instead drew a hairline that reads as a scratch. The fault
         common to both is that the head glow was computed from the distance
         *in front of* a head only, so there was never a round bright thing at
         the head at all, just where the profile happened to start.
    
         The glow is centered on the head now, measured to whichever head is
         nearer along the lane, so it is symmetric about the nucleus the way a
         coma is. */
      float behind = (1.0 - w) * gap;
      float ahead = w * gap;
      float toHead = min(ahead, behind);
      float nose = wide * 0.5;

      float near2 = toHead * toHead + across * across;
      float nucleus = exp(-near2 / (2.0 * nose * nose));
      float coma = exp(-near2 / (2.0 * (nose * 3.0) * (nose * 3.0))) * 0.42;

      /* The plume opens fast and fades fast, and is never as bright as the
         head. A tail that holds its brightness for its whole length is a
         streak of paint; what makes a comet read is that almost all of the
         light is in the first tenth of it.
    
         The onset is what keeps it continuous across a head. The plume exists
         only behind, so its value would step from nothing to something at the
         nucleus; ramping it in over a seventh of its own length puts that
         transition under the brightest part of the coma, where there is nothing
         left to see. */
      float onset = 1.0 - exp(-behind / (0.15 * len));

      /* **The straight edge was a min().** Clamping the plume's width with
         min(nose * (1 + behind * 3), 0.16) saturates at a constant value of
         behind, and a constant behind is a straight line across the lane: above
         it the width was fixed and below it grew, and the kink between the two
         drew a hard diagonal through the frame. A cap on a quantity that varies
         along one axis is a cap along a line, which is the one shape this thing
         must not have.
    
         An exponential approach reaches the same limit without ever having a
         corner, so there is no line to see anywhere. */
      float spread = nose + (0.11 - nose) * (1.0 - exp(-behind * 1.3));
      float tail = exp(-behind / len) * onset *
        exp(-(across * across) / (2.0 * spread * spread)) * 0.5;

      /* Slowed where the pointer is, which is the other half of an obstacle. */
      float weight = mix(1.0, 0.5 + hash(vec2(id, 83.0)) * 0.95, v);
      lit += (nucleus + coma + tail) * alive * weight * mix(1.0, 0.45, near);
    }
    float grain = fbm(vec2(s.x * 3.0, s.y * 1.4 - t * 1.6));
    return lit * mix(0.55, 1.35, grain) * falloff(dot(q, q), 0.42);
  }

  /* Broad bands rolling under a warp.
   *
   * The softest shape here, and the only one with no filaments in it at all:
   * where braid and threads are made of lines, this is made of gradients. The
   * warp is what stops it sliding: bands moved by phase alone travel sideways
   * like a barcode, and bands moved through a warped domain roll.
   *
   * The pointer drags them. Bowing the phase toward it bends the crests without
   * changing how many there are, which is what a surface does when something
   * pulls across it.
   */
  float waves(vec2 q, float t, vec2 qp, float reach) {
    float pull = falloff(dot(q - qp, q - qp), 1.2) * reach;
    /* **The warp was eating the waves.** At an amplitude of 2.4 against a band
       frequency of 1.7 it swung the sine's argument by about four radians,
       which is more than a whole period: the wavefronts were destroyed rather
       than bent and what came out was turbulence. It read as marbled paper, and
       at a low scale it filled the frame with near white.
    
       A tenth of that bends the fronts and leaves them fronts. */
    float warp = warped(vec2(q.x * 0.5, q.y * 0.4), t * 0.3) - 0.5;
    vec2 w = q + warp * 0.32;

    /* Two systems crossing, lit where they agree, which is what the shape is
       named for and what it had stopped doing. One sine is a corrugation; two
       at different angles interfere, and the slow beat between them is the
       thing worth looking at. */
    /* **And the frequency was too low to be a wave at all.** At 2.3 the period
       is 2.7 in shape units against a visible half height of 1, so less than
       one crest fitted across the frame: there was nothing periodic to see, and
       every version of this that looked like anything looked like it because
       the warp was making clouds. Around 8 puts five crests across the frame,
       which is a wave field rather than a single swell.
    
       The two are deliberately not harmonic. Close but unequal frequencies beat
       against each other, and the slow traveling interference that produces is
       the thing worth watching. */
    float a = sin((w.y * 8.1 + w.x * 2.3) - t * 0.9 - pull * 1.4);
    float b = sin((w.y * 5.3 - w.x * 3.4) + t * 0.6 + pull * 1.0);

    /* **Added, these two make a lattice, not a wave field.** Equal amplitudes
       crossing at an angle give a regular grid of lobes, which came out as
       bubble wrap and got worse the more of it fitted on screen. Waves are
       lines. So one system carries the fronts and the other only varies their
       brightness along their length, which is what a real swell does: the
       crests stay crests and are taller in some places than others. */
    float band = a * 0.5 + 0.5;
    band *= mix(0.45, 1.0, b * 0.5 + 0.5);

    float grain = warped(vec2(w.x * 1.2 + 6.0, w.y * 0.85), t * 0.28);
    return pow(band, 2.2) * mix(0.55, 1.2, grain) * falloff(dot(q, q), 0.4);
  }

  /* Luminous threads, woven to a pinch.
   *
   * Five curves at different frequencies and speeds, each a thin bright line
   * rather than a band: what makes this read as woven is that they cross, and
   * what makes it read as one object rather than five is the pinch, where every
   * amplitude narrows at once and the whole weave gathers.
   *
   * The pointer is the pinch, which is the interaction this shape is for.
   * Carrying it along drags the gathering point with it and the threads open
   * behind and close ahead.
   */
  float threads(vec2 q, float t, vec2 qp, float reach) {
    float pinchAt = mix(0.0, qp.x, reach);
    /* Narrowed, not collapsed. At 0.88 the amplitude and the spacing both fell
       to a tenth and all seven threads landed on the same line, which is a
       bright blob rather than a gathering: what a pinch has to preserve is that
       there are still threads in it. */
    float gather = 1.0 - falloff((q.x - pinchAt) * (q.x - pinchAt), 1.1) * 0.6;

    /* Seven, and every one of them the same thread.
    
       The pass before this gave each its own amplitude, height, thickness and
       brightness, all from hashes, and the result was a scatter rather than a
       set: seven unrelated squiggles that happened to share a frame. What makes
       a weave read as a weave is that the strands are alike and only their
       phase differs, which is also what makes it a wave rather than a wobble.
    
       So one amplitude, one thickness, one weight, one frequency, and the
       phases fanned evenly across a turn. Alike, they cross at regular
       intervals instead of at coincidences. */
    float lit = 0.0;
    for (int i = 0; i < 7; i++) {
      float f = float(i);
      float phase = f * (6.2831853 / 7.0);

      /* Evenly spaced, and the spacing collapses at the pinch along with the
         amplitude: threads that only narrow still run parallel through it,
         where threads that also converge actually gather. */
      /* The spacing closes less than the amplitude does, so the threads draw
         together without stacking. */
      float lane = (f - 3.0) * 0.17 * mix(1.0, gather, 0.65);
      float amp = 0.34 * gather;

      /* A second harmonic at a third the frequency and a third the amplitude,
         which bends the long run of each thread without breaking it into
         wiggles. Low and quiet is the difference between a wave with character
         and a wave with noise on it. */
      float y =
        lane +
        sin(q.x * 1.5 + t * 0.55 + phase) * amp +
        sin(q.x * 0.5 - t * 0.3 + phase) * amp * 0.32;

      lit += falloff((q.y - y) * (q.y - y), 24.0);
    }
    /* Quiet grain. At the old depth it was texture on the threads rather than
       air around them, and a wave with grain on it is a wobble again. */
    float grain = fbm(vec2(q.x * 2.0, q.y * 2.0 - t));
    return lit * mix(0.85, 1.12, grain) * falloff(dot(q, q), 0.4);
  }

  /* Points adrift, and pushed aside.
   *
   * One per cell of a coarse lattice, jittered off center so the lattice never
   * shows, and drifting on its own small orbit. Nine cells are visited because a
   * point near a boundary has to be drawn by its neighbours too, which is what
   * stops them popping in and out at the seams.
   *
   * The pointer repels. Pushing along the offset rather than by its sign keeps
   * the displacement smooth, and it is the one response here where the reader
   * is plainly moving things rather than lighting them.
   */
  float particles(vec2 q, float t, vec2 qp, float reach) {
    float lit = 0.0;
    vec2 cell = floor(q * 2.6);
    for (int j = -1; j <= 1; j++) {
      for (int i = -1; i <= 1; i++) {
        vec2 c = cell + vec2(float(i), float(j));
        float a = hash(c);
        float b = hash(c + 17.3);
        float v = clamp(uVariance, 0.0, 1.0);
        vec2 at = (c + 0.5 + (vec2(a, b) - 0.5) * 0.85) / 2.6;
        at += vec2(
          sin(t * mix(1.0, 0.5 + a, v) + b * 6.28),
          cos(t * mix(1.0, 0.42 + b, v) + a * 6.28)
        ) * 0.07;

        vec2 away = at - qp;
        float push = falloff(dot(away, away), 2.2) * reach;
        at += away * push * 0.55;

        vec2 off = q - at;
        /* Size, which was flat at 52 for every mote, so a field whose members
           already differed in brightness and in how fast they wandered was
           still made of one object repeated. Nine cells are visited here, so
           unlike a streak lane a mote may be broader as well as tighter
           without leaving an edge anywhere. */
        float grade = mix(52.0, 52.0 * (0.62 + hash(c + 5.7) * 0.95), v);

        /* **Round, because a particle is round.** These were stretched two and a
           half times along a direction drawn per mote, on the reasoning that a
           starfield says nothing because stars are fixed. That was a problem
           nobody had, and the cure was worse: a fixed axis per mote is not
           motion, it is orientation, so a field of them reads as grains of rice
           pointing every which way rather than as particles at all. Motion, if
           it is ever wanted here, has to come from the direction each mote is
           actually traveling, and that is the wander below rather than a hash.
    
           The halo stays. An order of magnitude wider and a tenth the strength,
           so a mote sits in the field rather than on top of it: a hard little
           disc on a dark ground is a pixel, and light has a neighbourhood. */
        float core = falloff(dot(off, off), grade);
        float halo = falloff(dot(off, off), grade * 0.16) * 0.1;
        lit += (core + halo) * mix(0.8, 0.35 + a * 0.9, v);
      }
    }
    return lit * falloff(dot(q, q), 0.4);
  }

  /* Ink in a viscous medium, drawn through by where the pointer went.
   *
   * **The wake is one stroke, not eight marks.** Each trail point used to add a
   * vortex of its own, rotating the sample around its own center, which drew
   * eight discrete swirls fading in place: a row of blobs rather than anything
   * a hand had done. The marks are a polyline now. Distance is measured to the
   * nearest *segment*, age is interpolated along it, and what a reader sees is
   * a continuous stroke however far apart the samples fell.
   *
   * **And the displacement runs along the stroke, not around it.** Pushing the
   * sample down the tangent is advection: the pattern is carried the way the
   * hand went, which is what stirring looks like. Rotating it around a point is
   * a whirlpool, and eight whirlpools is a washing machine.
   *
   * The marks arrive oldest first, so consecutive indices are consecutive in
   * time. In the ring they are not, and a segment drawn across the wrap joined
   * the newest mark to the oldest with a bright bar through the middle of the
   * field.
   *
   * Nine, not eight: eight committed marks and the live head, which is held
   * outside the ring so that committing appends rather than overwrites. A
   * zero-length segment between the newest mark and the head is skipped below,
   * which is what makes the commit invisible.
   */
  float flowWake(vec2 at, mat2 turn, vec2 shift, out vec2 push) {
    push = vec2(0.0);
    float wake = 0.0;

    for (int i = 0; i < 8; i++) {
      vec3 a = uTrail[i];
      vec3 b = uTrail[i + 1];
      if (a.z >= 1.0 || b.z >= 1.0) {
        continue;
      }
      /* The marks arrive in screen space, and the field is sampled after a
         rotation, a scale and a parallax shift. Compared without carrying them
         through the same three, the wake sits somewhere else entirely: at a
         tilt of 42 and a scale of 1.7 it landed most of a frame from the
         cursor, which is what read as offset rather than as lagging. */
      vec2 pa = turn * (a.xy - shift) * uScale;
      vec2 pb = turn * (b.xy - shift) * uScale;
      vec2 ab = pb - pa;
      float len2 = dot(ab, ab);
      if (len2 < 1e-6) {
        continue;
      }
      float t = clamp(dot(at - pa, ab) / len2, 0.0, 1.0);
      vec2 off = at - (pa + ab * t);

      /* Elongated along the stroke, not round about it.
      
         A circular falloff makes the wake a tube of even thickness, which is
         what a pipe looks like and not what a stirred medium does. Ink pulled
         through a liquid smears the way the hand went: it reaches further along
         the direction of travel than across it. Weighting the along component
         down stretches the ellipse into that direction, and costs one dot
         product. */
      vec2 tangent = ab * inversesqrt(len2);
      float alongOff = dot(off, tangent);
      float acrossOff = dot(off, vec2(-tangent.y, tangent.x));
      float shaped = acrossOff * acrossOff + alongOff * alongOff * 0.3;

      /* Squared, so a wake thins as it dies rather than switching off. */
      float life = 1.0 - mix(a.z, b.z, t);
      float w = life * life * falloff(shaped, 3.2);
      wake += w;
      push += (ab * inversesqrt(len2)) * w;
    }

    /* Limited, because an unbounded displacement folds and a fold is a crease.
    
       Where the map from sample to displaced sample stops being one to one,
       neighbouring samples land on the same value and the pattern piles into a
       hard bright line: a caustic, which is what a sharp diagonal with a bright
       wedge beside it always is. The sum runs over eight segments of unit
       tangents, so near the stroke it reached several times the width of the
       falloff it was displacing across, and folded every time.
    
       The falloff is about a third of a unit wide, so the displacement has to
       stay under that for the map to stay monotone. Saturating rather than
       clamped: a clamp is a corner, and a corner in a displacement is the same
       crease by another route. */
    float mag = length(push);
    push = mag > 0.0 ? push * (0.24 / (0.9 + mag)) : vec2(0.0);
    return wake;
  }

  float flow(vec2 q, float t, mat2 turn, vec2 shift) {
    vec2 push;
    float wake = flowWake(q, turn, shift, push);
    /* Already limited inside, so it is applied whole. */
    vec2 p = q + push;

    /* The field is warped by itself twice over, which is what gives a liquid
       its folded look: each sample is displaced by the field's own value, so
       structure gathers into sheets rather than staying a cloud. */
    /* **Halved, because the detail was the problem.** At 1.15 and 2.3 every
       octave landed small enough that the frame filled edge to edge with fine
       crumple at one density: marbled stone, and it looked the same at every
       scale, gain and bloom because there was no large form for any of them to
       act on. Big shapes first, detail on top of them. */
    /* *The directional pass is reverted.* Sampling the ink stretched along a
       slow angle field did make filaments, and it made the shape busier and
       more literal than the soft masses it replaced. Preferred as it was, so it
       is as it was. The finding is worth keeping even though the code is not:
       isotropic noise cannot make a current, so anything wanting one has to
       carry a direction, and that is a bigger change than this shape wants. */
    float ink = warped(p * 0.55, t * 0.55);
    float sheet = warped(p * 1.1 + vec2(3.1, 1.7), t * 0.35);

    /* **Floors of 0.55 and 0.5 meant it was never dark anywhere.** The lowest
       the field could reach was a quarter lit, so every fragment landed in the
       same middle band and the frame came out an even swatch of texture with no
       structure to look at. Dropping the floor gives it voids.
    
       And a slow large mass over the top, so the liquid is thick in places and
       clear in others. Fine detail everywhere at one density is static; what
       makes a fluid read is that it gathers. */
    /* Thresholded, not just varied. A gentle modulation over a field that is
       lit everywhere is still lit everywhere; what a liquid needs is somewhere
       it simply is not, so the empty parts of the frame are what give the full
       parts a shape. */
    float mass = smoothstep(0.24, 0.72, noise(vec2(p.x * 0.45 - t * 0.1, p.y * 0.4 + t * 0.07)));
    /* The void floor is 0.18 rather than 0.05. At a low scale the mass noise
       varies less across the frame than the frame is wide, so a reader can land
       inside one void and see nothing at all: empty has to mean faint, not
       absent, or the shape can disappear entirely at a setting the property
       explicitly allows. */
    /* 0.28 rather than 0.18 under the voids, and a brighter ceiling. At a low
       scale the mass noise varies less across the frame than the frame is wide,
       so a reader can sit inside one void and see almost nothing: measured at
       scale 0.5, which came out near black. Empty has to mean faint. */
    float body = mix(0.05, 1.4, ink) * mix(0.4, 1.2, sheet) * mix(0.22, 1.45, mass);

    /* The resting state matters more than the stirred one: most readers never
       move the pointer, and a shape that is dark until touched is a shape most
       people never see. */
    /* 0.85 at rest, not 0.5. Halving an untouched field made sense when the
       field had a floor under it and could not go dark; with the voids in, the
       two together took it to a dim murk that read as wet rock. The wake still
       lifts what it touches, from a resting level that is worth looking at. */
    return body * (0.85 + clamp(wake, 0.0, 1.0) * 0.5) * falloff(dot(q, q), 0.55);
  }

  /* Light through moving water, focused into a web.
   *
   * **A caustic is where a wavefront folds, not where it is bright.** Sampling
   * a noise field and lighting the high parts gives clouds; what makes the
   * pattern on a pool floor is that the surface bends light and neighbouring
   * rays land on the same spot. The cheap stand-in for that is the *zero* of a
   * displaced wave sum rather than its peak: 1 - |sum| is thin and bright
   * exactly where the sum crosses, which is the fold.
   *
   * abs() puts a derivative discontinuity along each of those lines, and here
   * that is the drawing rather than a fault: a caustic edge is genuinely sharp,
   * which is the whole reason it reads as light rather than as fog.
   */
  float caustics(vec2 q, float t, vec2 qp, float reach) {
    /* The pointer is a stone in the water: the surface it disturbs is a ring
       of extra phase, so the web tightens around it rather than brightening. */
    float dropD = length(q - qp);
    float drop = falloff(dropD * dropD, 1.4) * reach;

    float lit = 0.0;
    for (int i = 0; i < 3; i++) {
      float f = float(i);
      vec2 p = q * (1.5 + f * 0.55);

      /* Warped by the field's own value, so the wavefronts bend the way a
         surface does rather than sliding as a rigid pattern. */
      vec2 w = p + vec2(
        noise(p * 1.25 + vec2(t * 0.42 + f * 4.0, 0.0)),
        noise(p * 1.1 - vec2(0.0, t * 0.36 + f * 7.0))
      ) * 0.85;

      float sum = sin(w.x * 3.1 + t * 0.7 + drop * 6.0) + sin(w.y * 2.7 - t * 0.55 - drop * 5.0);
      float fold = 1.0 - clamp(abs(sum) * 0.5, 0.0, 1.0);
      lit += pow(fold, 7.0) * (1.0 - f * 0.22);
    }

    /* **The pool has a lit part and a dark part.** Three layers of folds at one
       density fill the frame edge to edge and every version of it looks the
       same: bright everywhere carries the same amount of information as dark
       everywhere. A slow depth over the top decides where the light is getting
       through, so the web has somewhere to be faint and the eye somewhere to
       start. */
    float pool = smoothstep(0.2, 0.78, noise(vec2(q.x * 0.55 - t * 0.09, q.y * 0.5 + t * 0.06)));

    /* And the stone brightens what it disturbs as well as bending it, or the
       only evidence of a pointer is a phase shift nobody can see. */
    float dim = warped(q * 0.7, t * 0.2);
    return lit * mix(0.55, 1.25, dim) * mix(0.25, 1.25, pool) *
      (1.0 + drop * 0.9) * falloff(dot(q, q), 0.4);
  }

  /* A lattice in perspective, lit at its nodes.
   *
   * **The one shape here that is not weather.** Everything else in this set is
   * a fluid, a light or a sky, and a design system is none of those: it is a
   * structure, regular, with the interesting part at the joints. So this is
   * drawn rather than simulated, and it is the only one with straight lines in
   * it on purpose.
   *
   * Perspective is a divide, not a matrix. Scaling the grid by 1 / (1 + depth)
   * makes the cells shrink with distance and the whole thing recede, which is
   * the entire trick and costs one division.
   */
  float lattice(vec2 q, float t, vec2 qp, float reach) {
    /* The pointer lifts the plane nearest it, so the lattice crowds where a
       reader is looking. A structure answers by changing its spacing, which is
       the only thing about a lattice that can move without breaking it. */
    vec2 away = q - qp;
    float near = falloff(dot(away, away), 1.8) * reach;

    /* **A ground plane, not a mirrored one.** Dividing by abs(p.y) makes two
       floors meeting along y = 0, which reads as a bowtie with a crease down
       the middle rather than as anything receding. Dividing by the distance
       below a horizon is the actual projection: one plane, cells shrinking as
       they approach it, and nothing above it to fold back.
    
       It travels as well, so the structure arrives rather than sitting still.
       Perspective and motion together are what say the plane is a plane. */
    float below = max(1.45 - q.y, 0.14);
    float depth = 1.0 / below;
    vec2 g = vec2(
      q.x * depth * (2.3 + near * 1.4),
      depth * 1.6 + t * 0.28
    );
    vec2 cell = fract(g) - 0.5;

    /* The rails, thinner the further back they are, so the grid does not turn
       into a solid sheet at the horizon. */
    float rail = min(abs(cell.x), abs(cell.y));
    float lines = falloff(rail * rail, 24.0);

    /* The joints, which is where a lattice is actually a lattice, and brighter
       than the rails between them: a grid of even weight is graph paper. */
    float node = falloff(dot(cell, cell), 26.0) * 2.1 * (0.6 + near * 0.9);

    /* Faded toward the horizon, or the cells pile into a solid sheet exactly
       where they are smallest. */
    float far = smoothstep(0.0, 0.55, below) * smoothstep(3.4, 1.3, below);

    float dust = warped(q * 0.9, t * 0.25);
    return (lines * 0.5 + node) * far * mix(0.7, 1.2, dust) * falloff(dot(q, q), 0.42);
  }

  /* Cells, lit along the seams between them.
   *
   * **Provenance as a picture.** A Voronoi field is a set of territories, each
   * one everything nearer to its own point than to any other, and the drawing
   * is not the cells but the boundaries: where two claims meet is exactly
   * what Trace is about. Nothing here is lit except the disagreements.
   *
   * The wall is the second nearest distance minus the nearest, which is zero
   * on the boundary and grows into the interior. It is a genuine distance, so
   * it needs no epsilon and produces no crease.
   */
  float fracture(vec2 q, float t, vec2 qp, float reach) {
    vec2 g = q * 2.1;
    vec2 base = floor(g);
    vec2 f = g - base;

    float first = 9.0;
    float second = 9.0;
    for (int j = -1; j <= 1; j++) {
      for (int i = -1; i <= 1; i++) {
        vec2 o = vec2(float(i), float(j));
        vec2 id = base + o;

        /* Each site drifts on its own small orbit, so the seams breathe rather
           than the whole field sliding. */
        float a = hash(id) * 6.2831853;
        float b = hash(id + 41.7) * 6.2831853;
        vec2 site = o + 0.5 + 0.42 * vec2(sin(t * 0.5 + a), cos(t * 0.42 + b));

        /* Sites near the pointer are pushed away from it, which opens the
           cells there: a territory answers by giving ground. */
        vec2 world = (id + 0.5) / 2.1;
        vec2 shove = world - qp;
        site += normalize(shove + 0.0001) * falloff(dot(shove, shove), 2.4) * reach * 0.5;

        float d = length(site - f);
        if (d < first) {
          second = first;
          first = d;
        } else if (d < second) {
          second = d;
        }
      }
    }

    float wall = second - first;
    float seam = falloff(wall * wall, 17.0);

    /* **Not every seam is lit the same.** At one brightness the field is a
       mosaic of equal cells, which is a texture; what makes a set of
       territories read is that some borders are contested and most are not. A
       slow field decides which, and the dark stretches give the lit ones a
       shape. */
    float contested = smoothstep(0.24, 0.8, noise(vec2(q.x * 0.6 + t * 0.07, q.y * 0.55 - t * 0.05)));

    float grain = warped(q * 1.3, t * 0.3);
    return seam * mix(0.6, 1.25, grain) * mix(0.18, 1.3, contested) *
      falloff(dot(q, q), 0.42);
  }

  /* Two wave fields crossed, lit where they agree. */
  void main() {
    vec2 p = uv * 2.0 - 1.0;
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    p.x *= aspect;

    /* What the pointer does, and the two answers this stopped giving.
    
       It multiplied what was already lit, which shows nothing over a dark part
       of the field, so the visible answer to moving the cursor appeared
       wherever the shape happened to be bright rather than where the cursor
       was. Replacing that with a pull toward the pointer fixed the location and
       introduced the second problem: a radial pull is a magnifier, so every
       shape answered a pointer by zooming, and the lift that remained answered
       by glowing. Two gestures, applied identically to six different things,
       neither of which had anything to do with the thing it was applied to.
    
       There is no shared response now. What is left here is parallax, and each
       shape answers for itself below. */
    /* **No global response, parallax included.** Every named interaction is a
       promise about what the pointer does, and translating the whole field is
       not any of them: a consumer asking for a light asked for a light, not for
       a light and a lean. It survived a pass that removed the other two shared
       gestures on the grounds that it was small, and small is not the test.
    
       Measured on threads before removing it, sampling a column band on the far
       side of the frame from the cursor and correlating: 90 pixels of vertical
       travel on a 1224 pixel canvas, seven per cent of the frame, identical
       under native, light, shadow and ripple and zero under none. Whatever the
       pointer was told to do, it also moved everything.
    
       What answers the pointer now is each shape, in the terms it is made of,
       and the three generics for a consumer who asks for one. */
    vec2 q = p;

    /* **The tilt is an angle on the screen, not in the sampling space.**
     
       p.x is stretched by the aspect before anything is rotated, so a
       rotation applied here is a rotation in an anisotropic space, which is a
       shear. Working it through: a feature along the shape's own x axis sits
       where q.y = 0, which is p.y = -tan(a) * p.x, and since p.x is aspect
       times the screen's x the slope a reader sees is aspect * tan(a). At a
       widescreen 1.78 a tilt of 14 drew at 23.9 degrees, and the same number
       drew differently in every box the component was put in.
    
       Solving aspect * tan(a) = tan(tilt) gives the angle to rotate by. The two
       argument atan is what makes 90 work: tan blows up there, while
       atan(1, 0) is exactly a quarter turn. */
    float want = radians(uTilt);
    float a = atan(sin(want), cos(want) * aspect);
    mat2 turn = mat2(cos(a), sin(a), -sin(a), cos(a));
    q = turn * q * uScale;

    /* The pointer, carried into the same frame the shapes are drawn in, so each
       one can answer it in its own terms. */
    vec2 qp = turn * uPointer * uScale;

    float t = uTime * 0.06;

    /* Each shape answers the pointer in the terms it is made of, and there is
       no shared response left over.
    
       There used to be two, applied to everything: the field was pulled toward
       the cursor, and what was already lit was multiplied over a floor. Those
       are a zoom and a glow, they are the same gesture on every shape, and
       neither says anything about the shape it is on. A braid has a length and
       can lean. Rays have a source and can re-aim. A curtain has a horizon and
       can swell. Rings are made of spacing and can crowd. A weave is made of
       agreement and can shear. Flow is stirred, and had the only one of these
       that was ever about its own material. */
    /* A shape answers for itself only when nothing else has been asked for.
       Given a generic response, its own is switched off rather than layered
       under: two answers to one gesture is how the zoom and the glow got here
       in the first place. */
    float own = uInteraction == 0 ? uReach : 0.0;

    float d = 0.0;
    if (uShape == 0) {
      d = braid(q, t, qp, own);
    } else if (uShape == 1) {
      d = rays(q, t, qp, own);
    } else if (uShape == 2) {
      d = aurora(q, t, qp, own);
    } else if (uShape == 3) {
      d = streaks(q, t, qp, own);
    } else if (uShape == 4) {
      d = waves(q, t, qp, own);
    } else if (uShape == 5) {
      d = threads(q, t, qp, own);
    } else if (uShape == 6) {
      d = particles(q, t, qp, own);
    } else if (uShape == 7) {
      d = flow(q, t, turn, uPointer * 0.05 * uReach);
    } else if (uShape == 8) {
      d = caustics(q, t, qp, own);
    } else if (uShape == 9) {
      d = lattice(q, t, qp, own);
    } else {
      d = fracture(q, t, qp, own);
    }

    /* Bloom as an exponent on the field rather than a term inside each shape.
       Every shape is a density that falls off, so a power tightens or spreads
       that falloff and one control means the same thing in all five. */
    d = pow(max(d, 0.0), mix(2.0, 0.5, clamp(uBloom, 0.0, 1.0))) * uGain;

    /* The generic answers, for a consumer who has asked for one.
    
       All three are functions of distance from the pointer and nothing else,
       which is exactly what makes them generic and exactly what makes them say
       less. The light option lifts what is lit and puts a floor under itself so
       there is something at the cursor over a dark field. The shadow option is
       that gesture inverted, which suits a bright field where a lamp would be
       invisible. The ripple option is the one with a clock in it, so it keeps
       moving after the pointer has stopped. */
    if (uInteraction != 0 && uInteraction != 4) {
      vec2 toCursor = p - uPointer;
      float near = falloff(dot(toCursor, toCursor), 3.0) * uReach;
      if (uInteraction == 1) {
        d = d * (1.0 + near * 1.2) + near * 0.08;
      } else if (uInteraction == 2) {
        d *= 1.0 - near * 0.85;
      } else {
        float rings = sin(length(toCursor) * 13.0 - uTime * 3.2);
        d *= 1.0 + rings * near * 0.75;
      }
    }

    d *= mix(0.65, 1.35, smoothstep(-1.0, 1.0, q.y));

    /* Rolled off rather than clipped. A hard clamp flattens the core into a
       plateau of one value, which is what makes a bright shader look like a
       sticker; this compresses toward one and keeps the gradient inside it. */
    float lift = 1.0 - exp(-max(d, 0.0) * 1.15);

    vec3 rgb = mix(uGround, uHaze, smoothstep(0.0, 0.16, lift));
    rgb = mix(rgb, uGlow, smoothstep(0.10, 0.46, lift));
    rgb = mix(rgb, uPeak, smoothstep(0.40, 0.72, lift) * 0.6);

    /* Dithered before the buffer quantizes. A falloff this soft spans a few
       hundred 8-bit steps across a screen, and without a sub-step of noise it
       paints as visible rings. */
    float dither = (hash(gl_FragCoord.xy) - 0.5) / 255.0;
    color = vec4(rgb + dither, 1.0);
  }
`;var l0=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},W9,hW=4096,xW=4194304,Zz=500,v0=class W extends A{constructor(){super(...arguments);this.drift=0,this.reach=1,this.interactive=!1,this.bloom=0.5,this.gain=1,this.scale=1,this.speed=1,this.tilt=14,this.variance=1,this.tokens=new J6(this,()=>{this.readPalette(),this.paintOnce()}),this.palette={glow:[0.29,0.61,1],ground:[0,0,0],haze:[0.02,0.15,0.34],peak:[1,1,1]},this.canvas=null,this.gl=null,this.program=null,this.uniforms={},this.release=0,this.frame=0,this.elapsed=0,this.last=0,this.width=0,this.height=0,this.trail=new Float32Array(24).fill(1),this.trailNext=0,this.ordered=new Float32Array(27).fill(1),this.head={x:1,y:1},this.target={presence:0,x:0,y:0},this.eased={presence:0,x:0,y:0},this.box={height:1,left:0,top:0,width:1},this.opened=!1,this.opening=0,this.openBy=0,this.drop=()=>{if(this.release=0,this.gl&&this.program)this.gl.deleteProgram(this.program);this.gl?.getExtension("WEBGL_lose_context")?.loseContext(),this.program=null,this.gl=null},this.tick=(J)=>{if(!this.last)this.last=J;if(!this.interactive&&J-this.last<W9.CAPPED){this.frame=requestAnimationFrame(this.tick);return}let Z=Math.min((J-this.last)/1000,0.05);this.last=J,this.elapsed+=Z*Math.max(0,this.drifted(this.speed,0.4,0.043));let K=Math.hypot(this.target.x-this.eased.x,this.target.y-this.eased.y),Q=1-Math.exp(-Z/(0.028/(1+K*2.4)));if(!this.interactive)this.target.presence=0;this.eased.x+=(this.target.x-this.eased.x)*Q,this.eased.y+=(this.target.y-this.eased.y)*Q;let Y=this.target.presence>this.eased.presence,X=1-Math.exp(-Z/(Y?0.05:0.22));this.eased.presence+=(this.target.presence-this.eased.presence)*X,this.age(Z),this.advanceWake(),this.paint(),this.frame=requestAnimationFrame(this.tick)},this.handlePointer=(J)=>{if(this.motion?.matches)return;let{height:Z,left:K,top:Q,width:Y}=this.box,X=Y/Z;this.target.x=((J.clientX-K)/Y-0.5)*2*X,this.target.y=-((J.clientY-Q)/Z-0.5)*2,this.target.presence=this.interactive?1:0},this.handleLeave=()=>{this.target.presence=0},this.handleVisibility=()=>{if(document.hidden)this.stop();else this.play()},this.handleScroll=()=>{let J=this.getBoundingClientRect();this.box={...this.box,left:J.left,top:J.top}}}static{W9=this}static{this.styles=[_W]}static{this.CONTEXT={alpha:!0,antialias:!1,depth:!1,powerPreference:"low-power",stencil:!1}}render(){return F`<canvas part="canvas" aria-hidden="true"></canvas>`}firstUpdated(){this.start()}start(){if(!this.renderRoot.querySelector("canvas"))return;if(!this.program&&!this.build())return;if(this.motion=window.matchMedia("(prefers-reduced-motion: reduce)"),this.addEventListener("pointermove",this.handlePointer),this.addEventListener("pointerleave",this.handleLeave),this.visible=new IntersectionObserver(([J])=>{if(J?.isIntersecting)this.play();else this.stop()}),this.visible.observe(this),document.addEventListener("visibilitychange",this.handleVisibility),window.addEventListener("scroll",this.handleScroll,{capture:!0,passive:!0}),this.sized=new ResizeObserver(()=>{if(!this.measure()){this.paintOnce();return}if(this.opened){this.paint(),this.play();return}this.open()}),this.sized.observe(this),this.readPalette(),this.measure())this.open()}build(){let J=this.renderRoot.querySelector("canvas");if(!J)return!1;let Z=J.getContext("webgl2",W9.CONTEXT);if(Z?.isContextLost()){let K=document.createElement("canvas");K.setAttribute("part","canvas"),K.setAttribute("aria-hidden","true"),J.replaceWith(K),J=K,this.width=0,this.height=0,Z=J.getContext("webgl2",W9.CONTEXT)}if(this.canvas=J,this.gl=Z,!Z||Z.isContextLost())return!1;if(this.program=this.link(HW,uW),!this.program)return!1;Z.useProgram(this.program);for(let K of["uBloom","uGain","uGlow","uGround","uHaze","uInk","uInteraction","uPeak","uPointer","uReach","uResolution","uScale","uShape","uTilt","uTime","uTrail","uVariance"])this.uniforms[K]=Z.getUniformLocation(this.program,K);return!0}connectedCallback(){if(super.connectedCallback(),this.release)clearTimeout(this.release),this.release=0;if(this.hasUpdated)this.start()}updated(){this.paintOnce()}disconnectedCallback(){super.disconnectedCallback(),this.stop(),this.visible?.disconnect(),this.visible=void 0,this.removeEventListener("pointermove",this.handlePointer),this.removeEventListener("pointerleave",this.handleLeave),document.removeEventListener("visibilitychange",this.handleVisibility),window.removeEventListener("scroll",this.handleScroll,{capture:!0}),this.sized?.disconnect(),this.sized=void 0,this.release=window.setTimeout(this.drop,0)}readPalette(){let J=this.tokens.read("--helix-color-background",[0,0,0]),Z=J[0]*0.2126+J[1]*0.7152+J[2]*0.0722>0.5;this.palette={glow:this.tokens.read("--helix-color-primary",[0.29,0.61,1]),ground:J,haze:this.tokens.read("--helix-color-primary-subtle",[0.02,0.15,0.34]),peak:Z?this.tokens.read("--helix-color-primary-active",[0.1,0.2,0.55]):this.tokens.read("--helix-color-foreground",[1,1,1])}}link(J,Z){let K=this.gl;if(!K)return null;let Q=(V,O)=>{let B=K.createShader(V);if(!B)return null;if(K.shaderSource(B,O),K.compileShader(B),!K.getShaderParameter(B,K.COMPILE_STATUS))return console.error(K.getShaderInfoLog(B)),K.deleteShader(B),null;return B},Y=Q(K.VERTEX_SHADER,J),X=Q(K.FRAGMENT_SHADER,Z),$=Y&&X?K.createProgram():null;if(!Y||!X||!$)return null;return K.attachShader($,Y),K.attachShader($,X),K.linkProgram($),K.deleteShader(Y),K.deleteShader(X),$}measure(){let J=this.canvas,Z=this.gl;if(!J||!Z)return!1;let K=this.getBoundingClientRect();if(K.width<1||K.height<1)return!1;this.box={height:K.height,left:K.left,top:K.top,width:K.width};let Q=Math.min(window.devicePixelRatio||1,2)*0.85,Y=Math.max(this.box.width,this.box.height)*Q;if(Y>hW)Q*=hW/Y;let X=this.box.width*this.box.height*Q*Q;if(X>xW)Q*=Math.sqrt(xW/X);let $=Math.round(this.box.width*Q),V=Math.round(this.box.height*Q);if($===this.width&&V===this.height)return!1;return this.width=$,this.height=V,J.width=$,J.height=V,Z.viewport(0,0,$,V),Z.uniform2f(this.uniforms.uResolution??null,$,V),!0}paint(){let{gl:J,uniforms:Z}=this;if(!J||!this.program||!this.width)return;let{glow:K,ground:Q,haze:Y,peak:X}=this.palette;J.uniform3fv(Z.uGround??null,Q),J.uniform3fv(Z.uHaze??null,Y),J.uniform3fv(Z.uGlow??null,K),J.uniform3fv(Z.uPeak??null,X),J.uniform1f(Z.uTime??null,this.elapsed),J.uniform1i(Z.uShape??null,vW.indexOf(this.variant??"braid")),J.uniform1f(Z.uTilt??null,this.drifted(this.bearing,14,0.037)),J.uniform1f(Z.uScale??null,this.drifted(this.scale,0.32,0.061)),J.uniform1f(Z.uBloom??null,this.drifted(this.bloom,0.22,0.029)),J.uniform1f(Z.uGain??null,this.drifted(this.gain,0.3,0.053)),J.uniform1f(Z.uVariance??null,this.variance);for(let $=0;$<8;$++){let V=(this.trailNext+$)%8*3,O=$*3;this.ordered[O]=this.trail[V]??1,this.ordered[O+1]=this.trail[V+1]??1,this.ordered[O+2]=this.trail[V+2]??1}this.ordered[24]=this.head.x,this.ordered[25]=this.head.y,this.ordered[26]=0,J.uniform3fv(Z.uTrail??null,this.ordered),J.uniform2f(Z.uPointer??null,this.eased.x,this.eased.y),J.uniform1f(Z.uReach??null,this.eased.presence*Math.max(0,this.reach)),J.uniform1i(Z.uInteraction??null,Math.max(0,kW.indexOf(this.interaction??"native"))),J.drawArrays(J.TRIANGLES,0,3)}open(){if(this.opening)cancelAnimationFrame(this.opening),this.opening=0;if(this.openBy===0)this.openBy=performance.now()+Zz;let J=()=>{this.opening=0,this.opened=!0,this.paint(),this.play()};if(performance.now()>=this.openBy){J();return}this.opening=requestAnimationFrame(J)}paintOnce(){if(this.frame)return;this.paint()}static{this.CAPPED=33.333333333333336}play(){if(this.frame||this.motion?.matches||document.hidden||!this.gl||!this.width||!this.opened)return;this.frame=requestAnimationFrame(this.tick)}stop(){if(this.frame)cancelAnimationFrame(this.frame),this.frame=0;this.last=0}get bearing(){if(this.terminus===void 0)return this.tilt;let{height:J,width:Z}=this.box;return jW(this.terminus,Z/Math.max(J,1))}drifted(J,Z,K){if(!this.drift)return J;let Q=this.elapsed,Y=Math.sin(Q*K)*0.6+Math.sin(Q*K*1.618+2.1)*0.4;return J+Z*this.drift*Y}age(J){for(let Z=2;Z<this.trail.length;Z+=3){let K=(this.trail[Z]??1)+J/2;this.trail[Z]=K>1?1:K}}advanceWake(){if(!this.interactive)return;this.head.x=this.eased.x,this.head.y=this.eased.y;let J=(this.trailNext+7)%8*3,Z=this.head.x-(this.trail[J]??0),K=this.head.y-(this.trail[J+1]??0);if(Z*Z+K*K<0.014)return;let Q=this.trailNext*3;this.trail[Q]=this.head.x,this.trail[Q+1]=this.head.y,this.trail[Q+2]=0,this.trailNext=(this.trailNext+1)%8;for(let Y=2;Y<this.trail.length;Y+=3){if(Y===Q+2)continue;let X=(this.trail[Y]??1)+0.14285714285714285;this.trail[Y]=X>1?1:X}}};l0([q({reflect:!0})],v0.prototype,"variant",void 0);l0([q({type:Number})],v0.prototype,"drift",void 0);l0([q()],v0.prototype,"interaction",void 0);l0([q({type:Number})],v0.prototype,"reach",void 0);l0([q({reflect:!0,type:Boolean})],v0.prototype,"interactive",void 0);l0([q({type:Number})],v0.prototype,"bloom",void 0);l0([q({type:Number})],v0.prototype,"gain",void 0);l0([q({type:Number})],v0.prototype,"scale",void 0);l0([q({type:Number})],v0.prototype,"speed",void 0);l0([q({type:Number})],v0.prototype,"tilt",void 0);l0([q({type:Number})],v0.prototype,"terminus",void 0);l0([q({type:Number})],v0.prototype,"variance",void 0);v0=W9=l0([G("helix-aura")],v0);var IZ=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},PZ=12,g8=class W extends A{constructor(){super(...arguments);this.label="",this.warned=!1}get avatars(){return[...this.children??[]].filter((J)=>J instanceof HTMLElement)}get overflow(){let J=this.max??0;return J>0&&J<=PZ?Math.max(this.avatars.length-J,0):0}willUpdate(J){super.willUpdate(J),L(this.internals,{label:this.label,role:"group"})}updated(J){super.updated(J);let Z=this.max??0;if(Z>PZ&&this.avatars.length>Z&&!this.warned)this.warned=!0,console.warn(`<${this.localName}> has max="${this.max}", past the ${PZ} the fold is written for, so every avatar is shown and none are counted. Lower \`max\`, or hand the group the avatars you want shown.`)}render(){let J=this.overflow;return F`<slot @slotchange=${()=>this.requestUpdate()}></slot>
      ${J>0?F`<span part="overflow" aria-hidden="true">+${J}</span>`:""}`}};IZ([q()],g8.prototype,"label",void 0);IZ([q({reflect:!0,type:Number})],g8.prototype,"max",void 0);g8=IZ([G("helix-headless-avatar-group")],g8);var k6=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},Yz=(W)=>{let J=W.trim().split(/\s+/).filter(Boolean);if(J.length===0)return"";let Z=(Y)=>[...Y??""][0]??"",K=Z(J[0]),Q=J.length>1?Z(J[J.length-1]):"";return(K+Q).toUpperCase()},v7=class W extends A{constructor(){super(...arguments);this.src="",this.name="",this.failed=!1,this.handleError=(J)=>{this.failed=!0,this.relayNativeEvent(J)},this.handleLoad=(J)=>{this.relayNativeEvent(J)}}willUpdate(J){if(super.willUpdate(J),J.has("src"))this.failed=!1;L(this.internals,{label:this.name,role:this.name===""?"":"img"})}render(){if(this.src!==""&&!this.failed)return F`<img
        part="image"
        src=${this.src}
        alt=""
        @error=${this.handleError}
        @load=${this.handleLoad}
      />`;return this.renderInitials()}renderInitials(){return F`<slot>
      <span part="initials" aria-hidden="true">${Yz(this.name)}</span>
    </slot>`}};k6([q()],v7.prototype,"src",void 0);k6([q()],v7.prototype,"name",void 0);k6([U()],v7.prototype,"failed",void 0);v7=k6([G("helix-headless-avatar")],v7);var yW=N(`:host {
--_avatar-group-ring: var(--avatar-group-ring-color, var(--helix-color-background));
align-items: center;
display: flex;
}

::slotted(*) {
box-shadow: 0 0 0 var(--helix-border-thick) var(--_avatar-group-ring);
flex: 0 0 auto;
}

::slotted(*:not(:first-child)) {
margin-inline-start: calc(-1 * var(--avatar-group-overlap, var(--helix-space-sm)));
}

:host([max="1"]) ::slotted(:nth-child(n + 2)),
:host([max="2"]) ::slotted(:nth-child(n + 3)),
:host([max="3"]) ::slotted(:nth-child(n + 4)),
:host([max="4"]) ::slotted(:nth-child(n + 5)),
:host([max="5"]) ::slotted(:nth-child(n + 6)),
:host([max="6"]) ::slotted(:nth-child(n + 7)),
:host([max="7"]) ::slotted(:nth-child(n + 8)),
:host([max="8"]) ::slotted(:nth-child(n + 9)),
:host([max="9"]) ::slotted(:nth-child(n + 10)),
:host([max="10"]) ::slotted(:nth-child(n + 11)),
:host([max="11"]) ::slotted(:nth-child(n + 12)),
:host([max="12"]) ::slotted(:nth-child(n + 13)) {
display: none;
}

[part="overflow"] {
align-items: center;
margin-inline-start: calc(-1 * var(--avatar-group-overlap, var(--helix-space-sm)));
background-color: var(--helix-color-surface-sunken);
block-size: var(--avatar-size, var(--helix-size-control-md));
border-radius: var(--helix-radii-full);
box-shadow: 0 0 0 var(--helix-border-thick) var(--_avatar-group-ring);
color: var(--helix-color-foreground-muted);
display: inline-flex;
flex: 0 0 auto;
font-family: var(--helix-font-sans);
font-size: var(--helix-text-xs);
font-weight: var(--helix-weight-medium);
inline-size: var(--avatar-size, var(--helix-size-control-md));
justify-content: center;
}`);var Wz=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},mW=class W extends g8{static{this.styles=yW}};mW=Wz([G("helix-avatar-group")],mW);var pW=N(`:host {
--_avatar-size: var(--avatar-size, var(--helix-size-avatar));

align-items: center;

background-color: var(--avatar-background-color, var(--helix-color-surface-raised));
block-size: var(--_avatar-size);
border-radius: var(--helix-radii-full);
color: var(--helix-color-foreground);
display: inline-flex;
flex: 0 0 auto;
inline-size: var(--_avatar-size);
justify-content: center;
overflow: hidden;
}

:host([size="sm"]) {
--_avatar-size: var(--avatar-size, var(--helix-size-avatar-sm));
}

:host([size="lg"]) {
--_avatar-size: var(--avatar-size, var(--helix-size-avatar-lg));
}

:host([shape="square"]) {
border-radius: var(--helix-radii-md);
}

::slotted(*) {
block-size: 100%;
inline-size: 100%;
object-fit: cover;
}

[part="image"] {
block-size: 100%;
inline-size: 100%;
object-fit: cover;
}

[part="initials"] {
font-size: calc(var(--_avatar-size) * 0.4);
font-weight: var(--helix-weight-medium);
letter-spacing: var(--helix-tracking-wide);
line-height: 1;
user-select: none;
}

@media print {
:host {
box-shadow: none;
}
}`);var TZ=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},H6=class W extends v7{static{this.styles=pW}};TZ([q({reflect:!0})],H6.prototype,"shape",void 0);TZ([q({reflect:!0})],H6.prototype,"size",void 0);H6=TZ([G("helix-avatar")],H6);var u6=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},k7=class W extends A{constructor(){super(...arguments);this.value="",this.label=""}get blank(){return this.value.trim()!==""&&Number(this.value)===0}get text(){let J=Number(this.value);if(this.max!==void 0&&Number.isFinite(J)&&J>this.max)return`${this.max}+`;return this.value}render(){let J=this.blank,Z=this.text,K=!J&&(Z!==""||this.label!=="");return F`<slot></slot>
      <span
        part="indicator"
        data-blank=${J?"":z}
        data-single=${Z.length<=1?"":z}
        role=${K?"status":z}
        aria-label=${this.label!==""&&K?this.label:z}
        aria-hidden=${K?z:"true"}
        >${Z}</span
      >`}};u6([q()],k7.prototype,"value",void 0);u6([q({type:Number})],k7.prototype,"max",void 0);u6([q()],k7.prototype,"label",void 0);k7=u6([G("helix-headless-badge")],k7);var gW=N(`:host {
display: inline-flex;
position: relative;
vertical-align: middle;

--_badge-size: var(--helix-size-badge);
--_badge-text: var(--helix-text-xs);
--_badge-inset: var(--helix-space-2xs);
--_badge-dot: var(--helix-space-xs);
}

[part="indicator"] {
align-items: center;

background-color: var(--badge-background-color, var(--helix-color-primary-surface));
block-size: var(--_badge-size);
border-radius: var(--helix-radii-full);

box-shadow: 0 0 0 var(--helix-border-thick) var(--badge-ring-color, var(--helix-color-background));
color: var(--helix-color-foreground-on-accent);
display: inline-flex;
font-size: var(--_badge-text);
font-weight: var(--helix-weight-semibold);

inset-block-start: var(--badge-offset, calc(var(--_badge-size) / 4));
inset-inline-end: var(--badge-offset, calc(var(--_badge-size) / 4));
justify-content: center;
line-height: 1;

min-inline-size: var(--_badge-size);
padding-inline: var(--_badge-inset);

pointer-events: none;
position: absolute;
translate: 50% -50%;
white-space: nowrap;
}

[part="indicator"]:empty {
block-size: var(--_badge-dot);
min-inline-size: var(--_badge-dot);
padding-inline: var(--helix-space-none);
}

[part="indicator"][data-single] {
padding-inline: var(--helix-space-none);
}

[part="indicator"] {
scale: 1;
transition:
opacity var(--helix-duration-fast) var(--helix-easing-standard),
scale var(--helix-duration-normal) var(--helix-easing-emphasized);
}

[part="indicator"][data-blank] {
opacity: 0;
scale: 0;
transition:
opacity var(--helix-duration-fast) var(--helix-easing-standard),
scale var(--helix-duration-fast) var(--helix-easing-accelerate);
}

@media (prefers-reduced-motion: reduce) {
[part="indicator"] {
transition: none;
}
}

:host([tone="danger"]) [part="indicator"] {
background-color: var(--badge-background-color, var(--helix-color-danger-surface));
}

:host([tone="neutral"]) [part="indicator"] {
background-color: var(--badge-background-color, var(--helix-color-surface-raised));
color: var(--helix-color-foreground);
}

@media (prefers-reduced-motion: reduce) {
[part="indicator"][data-blank] {
transition: none;
}
}

@media print {
:host {
box-shadow: none;
}
}`);var nW=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},UZ=class W extends k7{static{this.styles=gW}};nW([q({reflect:!0})],UZ.prototype,"tone",void 0);UZ=nW([G("helix-badge")],UZ);var x1=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},Kz=new Set(["div","p","section","span"]),c0=class W extends g(A){constructor(){super(...arguments);this.content="",this.for="",this.placement="top",this.offset=8,this.within="",this.disabled=!1,this.persist=!1,this.delay=400,this.delayOut=100,this.holds=new Set,this.bubbleLayer=new d(this,{anchor:()=>this.trigger,arrow:()=>this.renderRoot.querySelector('[part="arrow"]'),boundary:()=>[this,this.named],offset:()=>{let J=this.renderRoot.querySelector('[part="arrow"]');return this.offset+(J?.offsetWidth??0)/Math.SQRT2},onDismiss:()=>this.hide(),placement:()=>this.placement,surface:()=>this.renderRoot.querySelector('[part="tooltip"]'),within:()=>this.enclosure}),this.handleContentChange=()=>{this.requestUpdate()},this.showLater=()=>{this.holds.add("pointer"),clearTimeout(this.timer),this.timer=setTimeout(()=>this.show(),this.delay)},this.hideLater=()=>{this.holds.delete("pointer"),clearTimeout(this.timer),this.timer=setTimeout(()=>this.release(),this.delayOut)},this.showNow=(J)=>{let Z=J.target;if(Z instanceof Element&&!Z.matches(":focus-visible"))return;this.holds.add("focus"),this.show()},this.releaseFocus=()=>{this.holds.delete("focus"),this.release()},this.handleActivate=()=>{if(this.persist)return;this.holds.clear(),this.hide()},this.handleKeydown=(J)=>{if(J.key==="Escape"&&this.open)this.holds.clear(),this.hide()},this.audited=!1}get trigger(){let J=this.named;if(J)return J;return D1(this.renderRoot.querySelector("slot:not([name])"),this)}reposition(){this.bubbleLayer.reposition()}get named(){if(this.for==="")return null;return this.getRootNode().getElementById?.(this.for)??null}get enclosure(){if(this.within==="")return null;let J=this.getRootNode();return J instanceof Document||J instanceof ShadowRoot?J.getElementById(this.within):null}get bubble(){return this.renderRoot.querySelector('[part="tooltip"]')}get hasContent(){if(this.content!=="")return!0;return(this.renderRoot.querySelector('slot[name="content"]')?.assignedNodes()??[]).some((Z)=>{if(Z.nodeType!==Node.ELEMENT_NODE)return Z.textContent?.trim()!=="";let K=Z;return Kz.has(K.localName)?K.childElementCount>0||K.textContent?.trim()!=="":!0})}get describedText(){if(this.content!=="")return this.content;return(this.renderRoot.querySelector('slot[name="content"]')?.assignedNodes()??[]).map((Z)=>Z.textContent??"").join(" ").replace(/\s+/gu," ").trim()}show(){if(clearTimeout(this.timer),this.disabled||!this.hasContent||this.open)return;if(!this.requestOpen(!0))return}hide(){if(clearTimeout(this.timer),!this.open)return;if(!this.requestOpen(!1))return;this.bubbleLayer.hide()}release(){if(this.holds.size===0)this.hide()}bind(){let J=this.named??this;if(this.bound===J)return;this.unbind(),J.addEventListener("pointerenter",this.showLater),J.addEventListener("pointerleave",this.hideLater),J.addEventListener("focusin",this.showNow),J.addEventListener("focusout",this.releaseFocus),J.addEventListener("click",this.handleActivate),this.bound=J}unbind(){this.bound?.removeEventListener("pointerenter",this.showLater),this.bound?.removeEventListener("pointerleave",this.hideLater),this.bound?.removeEventListener("click",this.handleActivate),this.bound?.removeEventListener("focusin",this.showNow),this.bound?.removeEventListener("focusout",this.releaseFocus),this.bound=void 0}auditDescription(){if(this.audited||this.for===""||!this.hasContent)return;this.audited=!0;let J=this.named;if(!J){console.warn(`<${this.localName} for="${this.for}"> found no element with that id in its own tree, so it has nothing to describe and nothing to point at. Ids resolve per tree: an element inside another shadow root is not reachable from here.`);return}let Z=`${J.getAttribute("aria-describedby")??""} ${J.getAttribute("aria-labelledby")??""}`.split(/\s+/).filter(Boolean);if(this.id!==""&&Z.includes(this.id))return;console.warn(`<${this.localName} for="${this.for}"> is not read out with its trigger. The link is written from the trigger, not from here: give this tooltip an \`id\` and add \`aria-describedby="<that id>"\` to the element it names. Written in your own markup it survives server rendering, which is why this element will not write it for you.`)}connectedCallback(){super.connectedCallback(),document.addEventListener("keydown",this.handleKeydown)}disconnectedCallback(){super.disconnectedCallback(),this.unbind(),document.removeEventListener("keydown",this.handleKeydown),this.holds.clear(),clearTimeout(this.timer)}firstUpdated(J){super.firstUpdated(J),this.bind()}updated(J){if(super.updated(J),J.has("for"))this.bind();if(J.has("open"))if(this.open)this.bubbleLayer.show(),this.auditDescription();else this.bubbleLayer.hide();let Z=this.bubble;if(!Z)return;L(this.internals,{describedBy:this.hasContent?[Z]:[],label:this.for===""?"":this.describedText})}render(){return F`<slot></slot>
      <div part="tooltip" popover="manual" role="tooltip">
        <span part="arrow"></span>
        <slot name="content" @slotchange=${this.handleContentChange}
          >${this.content}</slot
        >
      </div>`}};x1([q()],c0.prototype,"content",void 0);x1([q()],c0.prototype,"for",void 0);x1([q()],c0.prototype,"placement",void 0);x1([q({type:Number})],c0.prototype,"offset",void 0);x1([q()],c0.prototype,"within",void 0);x1([q({reflect:!0,type:Boolean})],c0.prototype,"disabled",void 0);x1([q({reflect:!0,type:Boolean})],c0.prototype,"persist",void 0);x1([q({attribute:"delay",type:Number})],c0.prototype,"delay",void 0);x1([q({attribute:"delay-out",type:Number})],c0.prototype,"delayOut",void 0);c0=x1([G("helix-headless-tooltip")],c0);var Q9=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},K9=100,nJ=class W extends r1(A){get scaled(){return new Set((this.secondary??"").split(/\s+/).map((J)=>J.trim().toLowerCase()).filter(Boolean))}get lined(){return new Set((this.lines??"").split(/\s+/).map((J)=>J.trim().toLowerCase()).filter(Boolean))}get rulesValue(){return this.gridlines!==void 0&&this.gridlines!=="category"}get rulesCategory(){return this.gridlines==="both"||this.gridlines==="category"}willUpdate(J){super.willUpdate(J),this.pointer.axis=this.direction==="horizontal"?"block":"inline"}render(){let J=this.series,Z=J[0]?.points.map((H)=>H.label)??[];if(Z.length===0)return F`<div id="helix-chart-plot" part="plot"></div>`;let K=this.scaled,Q=(H)=>K.has(H.name.trim().toLowerCase()),Y=J.flatMap((H)=>H.points.map((n)=>n.value)),X=(H)=>{let n=J.filter(H).flatMap((J0)=>J0.points.map((F0)=>F0.value));return n.length>0?n:Y.length>0?Y:[0]},[$,V]=e1(K.size===0?X(()=>!0):X((H)=>!Q(H))),O=[Math.min(0,$),Math.max(0,V)],B=this.direction==="horizontal"?[0,K9]:[K9,0],D=j0(O,B),P=D(0),I=this.direction==="horizontal",[C,M]=e1(K.size>0?X(Q):[0]),w=[Math.min(0,C),Math.max(0,M)],R=K.size>0?j0(w,B):void 0,b=R===void 0?0:Math.max(...[...yJ(O),...yJ(w)].map((H)=>H.toLocaleString().length)),f=J.filter(Q),p=f.length===1&&f[0]!==void 0?`--bar-chart-secondary: var(--chart-series-${c(J.indexOf(f[0]))})`:void 0;return F`${R===void 0?z:this.renderAxis(D,O,"primary",I,b)}${this.renderPlot(J,Z,D,O,P,R)}${R===void 0?z:this.renderAxis(R,w,"secondary",I,b,p)}${this.renderLabels(Z)}`}renderPlot(J,Z,K,Q,Y,X){let $=this.direction==="horizontal",V=100/Z.length,O=this.lined,B=this.scaled,D=(b)=>B.has(b.name.trim().toLowerCase()),P=(b)=>X!==void 0&&D(b)?X:K,I=J.map((b,f)=>({one:b,tone:f})).filter(({one:b})=>!O.has(b.name.trim().toLowerCase())),C=V*0.72/Math.max(I.length,1),M=I.length>1?C*0.08:0,w=C-M,R=(b,f,p,H,n)=>{let J0=n(b),F0=Math.min(Y,J0),p0=Math.abs(Y-J0),Z0=f*V+V*0.14+p*C+M/2;return $?_`<rect
            data-series=${c(H)}
            height=${w}
            style="--chart-series: var(--chart-series-${c(H)}); --chart-bar-wash: url(#helix-bar-wash-${c(H)})"
            part="bar"
            width=${p0}
            x=${F0}
            y=${Z0}
          />`:_`<rect
            data-series=${c(H)}
            height=${p0}
            style="--chart-series: var(--chart-series-${c(H)}); --chart-bar-wash: url(#helix-bar-wash-${c(H)})"
            part="bar"
            width=${w}
            x=${Z0}
            y=${F0}
          />`};return F`<div
      aria-hidden="true"
      id="helix-chart-plot"
      part="plot"
    >
      <svg part="svg"
        preserveAspectRatio="none"
        viewBox="0 0 100 ${K9}"
        xmlns="http://www.w3.org/2000/svg"
      >
        ${_`<defs>
            ${J.map((b,f)=>_`<linearGradient
                id="helix-bar-wash-${c(f)}"
                style="--chart-series: var(--chart-series-${c(f)})"
                x1="0"
                x2=${$?"1":"0"}
                y1="0"
                y2=${$?"0":"1"}
              >
                <stop offset="0" part="bar-wash-start" />
                <stop offset="1" part="bar-wash-end" />
              </linearGradient>`)}
          </defs>`}
        ${this.renderGridlines(K,Q,$,Z.length)}
        ${$?_`<line part="baseline" x1=${Y} x2=${Y} y1="0" y2="100" />`:_`<line part="baseline" x1="0" x2="100" y1=${Y} y2=${Y} />`}
        ${this.renderBand(Z.length,$)}
        ${Z.map((b,f)=>_`<g data-active=${this.pointer.at===f?"":z} part="group">
              ${I.map(({one:p,tone:H},n)=>R(p.points[f]?.value??0,f,n,H,P(p)))}
            </g>`)}
        ${J.map((b)=>O.has(b.name.trim().toLowerCase())?this.renderLine(b,J.indexOf(b),V,P(b),$):z)}
      </svg>
      ${this.renderTooltip()}
    </div>`}renderAxis(J,Z,K,Q,Y,X){let $=Q?void 0:`--bar-chart-axis: ${Y}ch`;return F`<div
      aria-hidden="true"
      data-axis=${K}
      part="axis"
      style=${[$,X].filter(Boolean).join("; ")||z}
    >
      ${yJ(Z).map((V)=>F`<span
            part="tick"
            style=${Q?`inset-inline-start: ${J(V)}%`:`inset-block-start: ${J(V)}%`}
            >${V.toLocaleString()}</span
          >`)}
    </div>`}renderGridlines(J,Z,K,Q){if(this.gridlines===void 0)return z;let Y=100/Math.max(Q,1),X=this.rulesCategory?Array.from({length:Q},(V,O)=>(O+0.5)*Y).map((V)=>K?_`<line part="gridline" x1="0" x2="100" y1=${V} y2=${V} />`:_`<line part="gridline" x1=${V} x2=${V} y1="0" y2="100" />`):[],$=this.rulesValue?yJ(Z).map((V)=>K?_`<line part="gridline" x1=${J(V)} x2=${J(V)} y1="0" y2="100" />`:_`<line part="gridline" x1="0" x2="100" y1=${J(V)} y2=${J(V)} />`):[];return _`${X}${$}`}renderBand(J,Z){let K=this.pointer.at;if(K<0||J===0)return z;let Q=100/J;return Z?_`<rect height=${Q} part="band" width="100" x="0" y=${K*Q} />`:_`<rect height="100" part="band" width=${Q} x=${K*Q} y="0" />`}renderLabels(J){return F`<div aria-hidden="true" part="labels">
      ${J.map((Z)=>F`<span part="label">${Z}</span>`)}
    </div>`}renderLine(J,Z,K,Q,Y){let X=J.points.map(($,V)=>{let O=V*K+K/2,B=Q($.value);return Y?[B,O]:[O,B]});return _`<path
      d=${L7(X,"straight")}
      data-series=${c(Z)}
      part="line"
      style="--chart-series: var(--chart-series-${c(Z)})"
    />`}renderTooltip(){let J=this.pointer.at,Z=this.series;if(J<0||Z.length===0)return e0(this.sourceRows,J,this.tag("tooltip"));let K=Z.map((C)=>C.points[J]?.value??0),Q=Z.flatMap((C)=>C.points.map((M)=>M.value)),[Y,X]=e1(Q.length>0?Q:[0]),$=[Math.min(0,Y),Math.max(0,X)],V=this.direction==="horizontal",O=V?j0($,[0,K9]):j0($,[K9,0]),B=K.map((C)=>O(C)),D=V?Math.max(...B):Math.min(...B),P=100/this.readings,I=J*P+P/2;return e0(this.sourceRows,J,this.tag("tooltip"),{placement:V?"right":"top",x:V?`${D}%`:`${I}%`,y:V?`${I}%`:`${D}%`})}};Q9([q({reflect:!0})],nJ.prototype,"direction",void 0);Q9([q()],nJ.prototype,"gridlines",void 0);Q9([q()],nJ.prototype,"lines",void 0);Q9([q({reflect:!0})],nJ.prototype,"secondary",void 0);nJ=Q9([G("helix-headless-bar-chart")],nJ);var lJ=N(`:host {
--chart-series-1: var(--helix-color-series-1);
--chart-series-2: var(--helix-color-series-2);
--chart-series-3: var(--helix-color-series-3);
--chart-series-4: var(--helix-color-series-4);
--chart-series-5: var(--helix-color-series-5);
--chart-series-6: var(--helix-color-series-6);
--chart-series-7: var(--helix-color-series-7);
--chart-series-8: var(--helix-color-series-8);
--chart-series-9: var(--helix-color-series-9);
--chart-series-10: var(--helix-color-series-10);
--chart-series-11: var(--helix-color-series-11);
--chart-series-12: var(--helix-color-series-12);
--chart-series-13: var(--helix-color-series-13);
--chart-series-14: var(--helix-color-series-14);
--chart-series-15: var(--helix-color-series-15);
--chart-series-16: var(--helix-color-series-16);
--chart-series-17: var(--helix-color-series-17);
--chart-series-18: var(--helix-color-series-18);
--chart-series-19: var(--helix-color-series-19);
--chart-series-20: var(--helix-color-series-20);
--chart-series-21: var(--helix-color-series-21);
--chart-series-22: var(--helix-color-series-22);
--chart-series-23: var(--helix-color-series-23);
--chart-series-24: var(--helix-color-series-24);
}

@media print {
:host {
box-shadow: none;
print-color-adjust: exact;
}
}`);var lW=N(`:host {
display: grid;
position: relative;
gap: var(--bar-chart-gap, var(--helix-space-2xs));
}

[part="plot"] {
position: relative;

block-size: var(--bar-chart-block-size, 12em);
}

[part="plot"] svg {
block-size: 100%;
inline-size: 100%;

overflow: visible;
}

[part="baseline"] {
stroke: var(--helix-color-border);
stroke-width: var(--helix-border-thin);
vector-effect: non-scaling-stroke;
}

[part="bar"] {
clip-path: inset(var(--_bar-chart-foot, 0) round var(--_bar-chart-corners));
fill: var(--_bar-chart-series);

--_bar-chart-corners: var(--bar-chart-bar-radius, 2px) var(--bar-chart-bar-radius, 2px) 0 0;
--_bar-chart-base: 0 0 calc(var(--bar-chart-bar-stroke, var(--helix-border-thick)) / 2) 0;
}

:host([direction="horizontal"]) [part="bar"] {
--_bar-chart-corners: 0 var(--bar-chart-bar-radius, 2px) var(--bar-chart-bar-radius, 2px) 0;
--_bar-chart-base: 0 0 0 calc(var(--bar-chart-bar-stroke, var(--helix-border-thick)) / 2);
}

[part="labels"] {
display: grid;
grid-auto-columns: 1fr;
grid-auto-flow: column;
}

[part="label"] {
color: var(--helix-color-foreground-muted);
font-size: var(--helix-text-xs);
overflow: hidden;
text-align: center;
text-overflow: ellipsis;
white-space: nowrap;
}

:host([direction="horizontal"]) {
grid-template-columns: auto 1fr;
}

:host([direction="horizontal"]) [part="labels"] {
grid-column: 1;
grid-row: 1;
}

:host([direction="horizontal"]) [part="plot"] {
grid-column: 2;
grid-row: 1;
}

:host([direction="horizontal"]) [part="labels"] {
grid-auto-columns: auto;
grid-auto-flow: row;
grid-auto-rows: 1fr;
}

:host([direction="horizontal"]) [part="label"] {
align-self: center;
text-align: end;
}

[part="bar"],
[part="line"] {
--_bar-chart-series: var(--chart-series);
}

[part="mark"] {
block-size: 1px;
inline-size: 1px;
pointer-events: none;
position: absolute;
}

[part="tooltip-anchor"] {
inset: 0;
pointer-events: none;
position: absolute;
}

[part="tooltip-label"] {
display: block;
font-weight: var(--helix-weight-medium);
margin-block-end: var(--helix-space-2xs);
}

[part="tooltip-cell"] {
align-items: baseline;
column-gap: var(--helix-space-sm);
display: grid;
grid-template-columns: 0.5em minmax(0, 1fr) auto;
}

[part="tooltip-name"] {
grid-column: 2;

opacity: 0.72;
}

[part="tooltip-value"] {
font-variant-numeric: tabular-nums;
grid-column: 3;
}

[part="tooltip-cell"][data-series]::before {
block-size: 0.5em;
border-radius: var(--helix-radii-full);
content: "";
grid-column: 1;
inline-size: 0.5em;
}

[part="tooltip-cell"][data-series="1"]::before {
background-color: var(--helix-color-series-1);
}

[part="tooltip-cell"][data-series="2"]::before {
background-color: var(--helix-color-series-2);
}

[part="tooltip-cell"][data-series="3"]::before {
background-color: var(--helix-color-series-3);
}

[part="tooltip-cell"][data-series="4"]::before {
background-color: var(--helix-color-series-4);
}

[part="tooltip-cell"][data-series="5"]::before {
background-color: var(--helix-color-series-5);
}

[part="tooltip-cell"][data-series="6"]::before {
background-color: var(--helix-color-series-6);
}

[part="tooltip-cell"][data-series="7"]::before {
background-color: var(--helix-color-series-7);
}

[part="tooltip-cell"][data-series="8"]::before {
background-color: var(--helix-color-series-8);
}

[part="tooltip-cell"][data-series="9"]::before {
background-color: var(--helix-color-series-9);
}

[part="tooltip-cell"][data-series="10"]::before {
background-color: var(--helix-color-series-10);
}

[part="tooltip-cell"][data-series="11"]::before {
background-color: var(--helix-color-series-11);
}

[part="tooltip-cell"][data-series="12"]::before {
background-color: var(--helix-color-series-12);
}

[part="tooltip-cell"][data-series="13"]::before {
background-color: var(--helix-color-series-13);
}

[part="tooltip-cell"][data-series="14"]::before {
background-color: var(--helix-color-series-14);
}

[part="tooltip-cell"][data-series="15"]::before {
background-color: var(--helix-color-series-15);
}

[part="tooltip-cell"][data-series="16"]::before {
background-color: var(--helix-color-series-16);
}

[part="tooltip-cell"][data-series="17"]::before {
background-color: var(--helix-color-series-17);
}

[part="tooltip-cell"][data-series="18"]::before {
background-color: var(--helix-color-series-18);
}

[part="tooltip-cell"][data-series="19"]::before {
background-color: var(--helix-color-series-19);
}

[part="tooltip-cell"][data-series="20"]::before {
background-color: var(--helix-color-series-20);
}

[part="tooltip-cell"][data-series="21"]::before {
background-color: var(--helix-color-series-21);
}

[part="tooltip-cell"][data-series="22"]::before {
background-color: var(--helix-color-series-22);
}

[part="tooltip-cell"][data-series="23"]::before {
background-color: var(--helix-color-series-23);
}

[part="tooltip-cell"][data-series="24"]::before {
background-color: var(--helix-color-series-24);
}

[part="plot"]:has([data-active]) [part="group"]:not([data-active]) {
opacity: 0.45;
}

[part="group"] {
transition: opacity var(--helix-duration-fast) var(--helix-easing-decelerate);
}

@media (prefers-reduced-motion: reduce) {
[part="group"] {
transition: none;
}
}

[part="bar"] {
transition:
height var(--helix-duration-normal) var(--helix-easing-decelerate),
width var(--helix-duration-normal) var(--helix-easing-decelerate),
x var(--helix-duration-normal) var(--helix-easing-decelerate),
y var(--helix-duration-normal) var(--helix-easing-decelerate);
}

@starting-style {
:host(:not([direction="horizontal"])) [part="bar"] {
height: 0;
y: 100;
}

:host([direction="horizontal"]) [part="bar"] {
width: 0;
}
}

@media (prefers-reduced-motion: reduce) {
[part="bar"] {
transition: none;
}
}

[part="plot"] {
cursor: crosshair;
}

[part="gridline"] {
stroke: var(--bar-chart-gridline-color, var(--helix-color-border));
stroke-width: var(--helix-border-thin);
vector-effect: non-scaling-stroke;
}

[part="band"] {
fill: var(--bar-chart-band-color, var(--helix-color-surface-sunken));
}

[part="line"] {
fill: none;
stroke: var(--bar-chart-line-color, var(--_bar-chart-series, var(--helix-color-series-1)));
stroke-linecap: round;
stroke-linejoin: round;
stroke-width: var(--bar-chart-line-width, 2.5px);
vector-effect: non-scaling-stroke;
}

:host([secondary]) {
grid-template-columns: auto 1fr auto;
}

:host([secondary]) [part="axis"][data-axis="primary"] {
grid-column: 1;
grid-row: 1;
}

:host([secondary]) [part="plot"] {
grid-column: 2;
grid-row: 1;
}

[part="axis"][data-axis="secondary"] {
--_bar-chart-axis-ink: color-mix(
in oklab,
var(--bar-chart-secondary) 45%,
var(--helix-color-foreground)
);

color: var(--_bar-chart-axis-ink, var(--helix-color-foreground-subtle));
}

:host([secondary]) [part="axis"][data-axis="secondary"] {
grid-column: 3;
grid-row: 1;
}

:host([secondary]) [part="labels"] {
grid-column: 2;
grid-row: 2;
}

:host([direction="horizontal"][secondary]) {
grid-template-columns: auto 1fr;
grid-template-rows: auto 1fr auto;
}

:host([direction="horizontal"][secondary]) [part="axis"][data-axis="secondary"] {
grid-column: 2;
grid-row: 1;
}

:host([direction="horizontal"][secondary]) [part="labels"] {
grid-column: 1;
grid-row: 2;
}

:host([direction="horizontal"][secondary]) [part="plot"] {
grid-column: 2;
grid-row: 2;
}

:host([direction="horizontal"][secondary]) [part="axis"][data-axis="primary"] {
grid-column: 2;
grid-row: 3;
}

[part="axis"] {
color: var(--helix-color-foreground-subtle);
font-size: var(--helix-text-xs);
font-variant-numeric: tabular-nums;
pointer-events: none;
position: relative;
}

:host(:not([direction="horizontal"])) [part="axis"] {
inline-size: var(--bar-chart-axis, 3ch);
}

:host([direction="horizontal"]) [part="axis"] {
block-size: 1lh;
}

[part="tick"] {
position: absolute;
}

:host(:not([direction="horizontal"])) [part="tick"] {
inset-inline-end: 0;
translate: 0 -50%;
}

:host([direction="horizontal"]) [part="tick"] {
translate: -50% 0;
}

:host(:not([direction="horizontal"])) [part="axis"][data-axis="secondary"] [part="tick"] {
inset-inline-end: auto;
inset-inline-start: 0;
}

[part="bar"] {
fill-opacity: calc(var(--_bar-chart-area, 1) * var(--_bar-chart-through, 1));
stroke-opacity: var(--_bar-chart-through, 1);
}

[part="bar"][data-emphasis="outlined"],
:host([emphasis="outlined"]) [part="bar"]:not([data-emphasis]) {
fill: var(--_bar-chart-shade);
stroke: var(--_bar-chart-series);
stroke-width: var(--bar-chart-bar-stroke, var(--helix-border-thick));
vector-effect: non-scaling-stroke;

--_bar-chart-foot: var(--_bar-chart-base);
}

[part="bar"][data-emphasis="subtle"],
:host([emphasis="subtle"]) [part="bar"]:not([data-emphasis]) {
stroke: var(--_bar-chart-series);
stroke-width: var(--bar-chart-bar-stroke, var(--helix-border-thick));
vector-effect: non-scaling-stroke;

--_bar-chart-area: 0.2;

--_bar-chart-foot: var(--_bar-chart-base);
}

[part="bar"] {
--_bar-chart-shade: color-mix(
in oklab,
var(--_bar-chart-series) 60%,
var(--helix-color-background)
);
}

[part="bar"][data-material="glass"],
:host([material="glass"]) [part="bar"]:not([data-material]) {
--_bar-chart-through: calc(0.62 * var(--helix-material-opacity));
}

[part="bar"][data-material="frosted"],
:host([material="frosted"]) [part="bar"]:not([data-material]) {
--_bar-chart-through: calc(0.88 * var(--helix-material-opacity));
}

:host([wash="gradient"]) [part="bar"] {
fill: var(--chart-bar-wash);
}

[part="bar-wash-start"] {
stop-color: var(--chart-series);
stop-opacity: calc(1 * var(--helix-material-opacity));
}

[part="bar-wash-end"] {
stop-color: var(--chart-series);
stop-opacity: calc(0.35 * var(--helix-material-opacity));
}

@media print {
:host {
box-shadow: none;
print-color-adjust: exact;
}
}`);var cW=N(`:host {
display: contents;
}

[part="tooltip"] {
overflow: visible;
align-items: center;
display: flex;
gap: var(--helix-space-2xs);

background-color: var(--tooltip-background-color, var(--helix-color-surface-inverse));
border: none;
border-radius: var(--helix-radii-sm);
color: var(--helix-color-foreground-inverse);
font-family: var(--helix-font-sans);
font-size: var(--helix-text-xs);

font-weight: var(--helix-weight-regular);
inline-size: max-content;
line-height: var(--helix-leading-tight);
margin: var(--helix-space-none);
max-inline-size: var(--tooltip-max-inline-size, 16rem);

opacity: 0;
padding: var(--helix-space-2xs) var(--helix-space-xs);
position: fixed;
scale: 0;

transition:
opacity var(--helix-duration-fast) var(--helix-easing-standard),
scale var(--helix-duration-fast) var(--helix-easing-emphasized),
display var(--helix-duration-fast) allow-discrete,
overlay var(--helix-duration-fast) allow-discrete;
}

[part="tooltip"][data-placed] {
opacity: 1;
scale: 1;
}

[part="arrow"] {
background-color: var(--tooltip-background-color, var(--helix-color-surface-inverse));
block-size: var(--tooltip-arrow-size, 0.5rem);
inline-size: var(--tooltip-arrow-size, 0.5rem);
position: absolute;
rotate: 45deg;
}

:host([material="glass"]) [part="tooltip"],
:host([material="glass"]) [part="arrow"] {
backdrop-filter: var(--tooltip-backdrop, var(--helix-material-backdrop));
background-color: var(--tooltip-background-color, var(--helix-material-translucent));
}

:host([material="frosted"]) [part="tooltip"],
:host([material="frosted"]) [part="arrow"] {
backdrop-filter: var(--tooltip-backdrop, blur(var(--helix-material-blur-lg)));
background-color: var(--tooltip-background-color, var(--helix-material-translucent-strong));
}

:host([material="frosted"]) [part="tooltip"],
:host([material="glass"]) [part="tooltip"] {
border: var(--helix-border-thin) solid var(--helix-color-border);
color: var(--helix-color-foreground);
}

[part="tooltip"][data-placement^="bottom"] [part="arrow"] {
inset-block-start: calc(var(--tooltip-arrow-size, 0.5rem) / -2);
}

[part="tooltip"][data-placement^="top"] [part="arrow"] {
inset-block-end: calc(var(--tooltip-arrow-size, 0.5rem) / -2);
}

[part="tooltip"][data-placement^="right"] [part="arrow"] {
inset-inline-start: calc(var(--tooltip-arrow-size, 0.5rem) / -2);
}

[part="tooltip"][data-placement^="left"] [part="arrow"] {
inset-inline-end: calc(var(--tooltip-arrow-size, 0.5rem) / -2);
}

[part="tooltip"][data-placement^="top"] {
transform-origin: var(--floating-arrow-x, 50%) 100%;
}

[part="tooltip"][data-placement^="bottom"] {
transform-origin: var(--floating-arrow-x, 50%) 0;
}

[part="tooltip"][data-placement^="left"] {
transform-origin: 100% var(--floating-arrow-y, 50%);
}

[part="tooltip"][data-placement^="right"] {
transform-origin: 0 var(--floating-arrow-y, 50%);
}

[part="tooltip"]:not(:popover-open) {
display: none;
}

@media (prefers-reduced-motion: reduce) {

[part="tooltip"] {
scale: 1;
transition: none;
}

[part="tooltip"][data-placed] {
scale: 1;
}
}

@media print {
:host {
display: none;
}
}`);var dW=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},CZ=class W extends c0{static{this.styles=cW}};dW([q({reflect:!0})],CZ.prototype,"material",void 0);CZ=dW([G("helix-tooltip")],CZ);var H7=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},cJ=class W extends nJ{static{this.tier="helix-"}updated(J){super.updated(J);let Z=($)=>new Set(($??"").split(/[\s,]+/).filter(Boolean).map((V)=>V.toLowerCase()).flatMap((V)=>{let O=this.series.findIndex((B)=>B.name.trim().toLowerCase()===V);return O<0?[]:[c(O)]})),K=($,V,O)=>{if(O)$.setAttribute(`data-${V}`,O);else $.removeAttribute(`data-${V}`)},Q=Z(this.outlined),Y=Z(this.subtle),X=Z(this.glass);for(let $ of this.renderRoot.querySelectorAll('[part="bar"]')){let V=Number($.dataset.series);K($,"emphasis",Q.has(V)?"outlined":Y.has(V)?"subtle":void 0),K($,"material",X.has(V)?"glass":void 0)}}static{this.styles=[lJ,lW]}};H7([q({reflect:!0})],cJ.prototype,"material",void 0);H7([q({reflect:!0})],cJ.prototype,"wash",void 0);H7([q()],cJ.prototype,"glass",void 0);H7([q({reflect:!0})],cJ.prototype,"emphasis",void 0);H7([q()],cJ.prototype,"outlined",void 0);H7([q()],cJ.prototype,"subtle",void 0);cJ=H7([G("helix-bar-chart")],cJ);var iW=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},X9=class W extends A{constructor(){super(...arguments);this.cite=""}markEmpty(){let J=this.renderRoot?.querySelector('[part="attribution"]'),Z=!o(this.renderRoot?.querySelector('slot[name="attribution"]'));J?.toggleAttribute("data-empty",Z),J?.toggleAttribute("hidden",Z)}updated(J){super.updated(J),this.markEmpty()}render(){return F`<blockquote part="blockquote" cite=${this.cite||z}>
      <slot></slot>
      <footer part="attribution"><slot name="attribution"></slot></footer>
    </blockquote>`}};iW([q()],X9.prototype,"cite",void 0);X9=iW([G("helix-headless-blockquote")],X9);var sW=N(`:host {
display: block;
}

[part="blockquote"] {
display: block;
margin: var(--helix-space-none);
}

slot:not([name]) {

color: var(--helix-color-foreground-muted);
font-family: var(--helix-font-display);
font-size: var(--blockquote-size, var(--helix-text-xl));
font-weight: var(--helix-weight-medium);
letter-spacing: var(--helix-tracking-tight);
line-height: var(--helix-leading-tight);
}

slot:not([name])::slotted(*) {
margin: var(--helix-space-none);
}

[part="attribution"] {
color: var(--helix-color-foreground-muted);
font-size: var(--helix-text-sm);

margin-block-start: var(--helix-space-sm);
}

[part="attribution"][data-empty] {
display: none;
}

@media print {
:host {
background-color: transparent;
box-shadow: none;
}
}`);var Qz=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},aW=class W extends X9{static{this.styles=sW}};aW=Qz([G("helix-blockquote")],aW);var $9=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},dJ=class W extends A{constructor(){super(...arguments);this.current=!1,this.target="",this.rel=""}willUpdate(J){super.willUpdate(J),L(this.internals,{role:"listitem"}),this.internals.ariaCurrent=this.current?"page":null}renderSeparator(){return F`<slot name="separator"
      ><svg part="separator-mark" fill="currentColor" viewBox=${O0.viewBox}>
        ${S(O0.content)}
      </svg></slot
    >`}render(){let J=F`<slot name="start"></slot><slot></slot><slot name="end"></slot>`,Z=(this.href??"")!==""&&!this.current;return F`<span part="separator" aria-hidden="true"
        >${this.renderSeparator()}</span
      >${Z?F`<a
              part="link"
              href=${this.href??""}
              target=${this.target||z}
              rel=${this.rel||z}
              >${J}</a
            >`:F`<span part="link">${J}</span>`}`}};$9([q({reflect:!0,type:Boolean})],dJ.prototype,"current",void 0);$9([q({reflect:!0})],dJ.prototype,"href",void 0);$9([q()],dJ.prototype,"target",void 0);$9([q()],dJ.prototype,"rel",void 0);dJ=$9([G("helix-headless-breadcrumb")],dJ);var Xz=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},h6=class W extends A{willUpdate(J){super.willUpdate(J),L(this.internals,{role:"navigation"})}render(){return F`<ol part="list" role="list">
      <slot></slot>
    </ol>`}};h6=Xz([G("helix-headless-breadcrumbs")],h6);var oW=N(`:host {

--icon-button-size: var(--breadcrumbs-control-size, calc(1lh + var(--helix-space-2xs) * 2));

--button-size: var(--breadcrumbs-control-size, calc(1lh + var(--helix-space-2xs) * 2));

align-items: center;
display: inline-flex;
gap: var(--breadcrumbs-gap, var(--helix-space-xs));
}

[part="separator"] {
color: var(--breadcrumbs-separator-color, var(--helix-color-foreground-subtle));
display: inline-flex;
user-select: none;
}

[part="separator"] svg {
block-size: 1em;
inline-size: 1em;
}

:host(:first-child) [part="separator"] {
display: none;
}

::slotted(a) {
background-color: transparent;
border-radius: var(--helix-radii-sm);
padding: var(--helix-space-2xs) var(--helix-space-xs);
transition: background-color var(--helix-duration-fast) var(--helix-easing-standard);
}

:host(:first-child) ::slotted(a) {
margin-inline-start: calc(var(--helix-space-xs) * -1);
}

::slotted(a:hover) {

background-color: var(
--breadcrumbs-hover-color,
color-mix(in oklab, var(--helix-color-foreground) 8%, transparent)
);
}

::slotted(a:focus-visible) {
outline: var(--helix-size-focus-ring) solid var(--helix-color-focus-ring);
outline-offset: var(--helix-size-focus-offset);
}

@media (prefers-reduced-motion: reduce) {
::slotted(a) {
transition: none;
}
}

:host {
font-weight: var(--helix-weight-medium);
}

:host([current]) {
color: var(--helix-color-foreground);
font-weight: var(--helix-weight-semibold);
}

:host(:dir(rtl)) [part="separator"] svg {
scale: -1 1;
}

[part="link"] {
align-items: center;
border-radius: var(--helix-radii-sm);
color: var(--helix-color-foreground-muted);
display: inline-flex;
gap: var(--helix-space-2xs);
padding: var(--helix-space-2xs) var(--helix-space-xs);
text-decoration: none;
}

:host(:not([href])) [part="link"] {
padding-block: var(--helix-space-none);
}

a[part="link"]:hover {
background-color: var(
--breadcrumbs-hover-color,
color-mix(in oklab, var(--helix-color-foreground) 8%, transparent)
);
color: var(--helix-color-foreground);
}

:host([current]) [part="link"] {
color: var(--helix-color-foreground);
}

:host([hidden]) {
display: none;
}`);var $z=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},rW=class W extends dJ{static{this.styles=oW}};rW=$z([G("helix-breadcrumb")],rW);var tW=N(`:host {
display: block;
}

[part="list"] {
align-items: center;
display: flex;
flex-wrap: wrap;
font-size: var(--helix-text-sm);
gap: var(--breadcrumbs-gap, var(--helix-space-xs));

list-style: none;
margin: var(--helix-space-none);
padding: var(--helix-space-none);
}

@media print {
:host {
box-shadow: none;
}
}`);var qz=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},eW=class W extends h6{static{this.styles=tW}};eW=qz([G("helix-breadcrumbs")],eW);var J1=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},V0=class W extends E{constructor(){super(...arguments);this.aria=new g9(this,{target:()=>this.renderRoot?.querySelector('[part="button"]')??null}),this.type="button",this.value="",this.formAction="",this.formEnctype="",this.formMethod="",this.formNoValidate=!1,this.formTarget="",this.label="",this.command="",this.commandFor="",this.handleClick=()=>{if(this.linkCommand(),this.sendCommand(),this.type==="button")return;let{form:J}=this;if(!J)return;if(this.type==="submit")this.submit(J);else J.reset()},this.focusable=!0}static{this.shadowRootOptions={...E.shadowRootOptions,delegatesFocus:!0}}submit(J){let Z=[],K=(Y,X)=>{if(X===null)return;let $=J.getAttribute(Y);J.setAttribute(Y,X),Z.push(()=>{if($===null)J.removeAttribute(Y);else J.setAttribute(Y,$)})};K("action",this.formAction||null),K("enctype",this.formEnctype||null),K("method",this.formMethod||null),K("novalidate",this.formNoValidate?"":null),K("target",this.formTarget||null);let Q=this.name!=="";if(Q)this.internals.setFormValue(this.value);try{J.requestSubmit()}finally{for(let Y of Z)Y();if(Q)this.internals.setFormValue(null)}}get commandForElement(){return this.renderRoot?.querySelector("button")?.commandForElement??this.commandTarget()}set commandForElement(J){let Z=this.renderRoot?.querySelector("button");if(Z)Z.commandForElement=J}linkCommand(){let J=this.renderRoot?.querySelector("button");if(!J||!n9())return;J.commandForElement=this.commandTarget()}commandTarget(){let J=this.getRootNode();return this.commandFor?J.getElementById?.(this.commandFor)??null:null}sendCommand(){if(!this.command||n9())return;this.commandTarget()?.dispatchEvent(new l9(this.command,this))}updated(J){super.updated(J),this.linkCommand()}render(){let J=F`<slot name="start"></slot><slot></slot><slot name="end"></slot>`,Z=this.focusable?z:"-1";return F`<button
      part="button"
      type="button"
      aria-label=${this.label||z}
      command=${this.command||z}
      tabindex=${Z}
      ?disabled=${this.isDisabled}
      @click=${this.handleClick}
    >
      ${J}
    </button>`}};J1([q()],V0.prototype,"type",void 0);J1([q()],V0.prototype,"value",void 0);J1([q({attribute:"formaction"})],V0.prototype,"formAction",void 0);J1([q({attribute:"formenctype"})],V0.prototype,"formEnctype",void 0);J1([q({attribute:"formmethod"})],V0.prototype,"formMethod",void 0);J1([q({attribute:"formnovalidate",type:Boolean})],V0.prototype,"formNoValidate",void 0);J1([q({attribute:"formtarget"})],V0.prototype,"formTarget",void 0);J1([q()],V0.prototype,"label",void 0);J1([q()],V0.prototype,"command",void 0);J1([q({attribute:"commandfor"})],V0.prototype,"commandFor",void 0);J1([q({attribute:!1})],V0.prototype,"focusable",void 0);V0=J1([G("helix-headless-button")],V0);var JK=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},n8=(W)=>{class J extends W{}return JK([q({reflect:!0})],J.prototype,"emphasis",void 0),JK([q({reflect:!0})],J.prototype,"tone",void 0),J};var ZK=N(`:host {
display: inline-flex;
}

:host {
--_button-edge: var(--helix-color-border);

--_button-fill: var(--_button-tone);
--_button-fill-hover: var(--_button-tone-hover);
--_button-on-tone: var(--helix-color-background);
--_button-tone: var(--helix-color-foreground);

--_button-tone-hover: color-mix(
in oklab,
var(--helix-color-foreground) 86%,
var(--helix-color-background)
);
}
:host([tone="primary"]) {
--_button-edge: var(--helix-color-primary);
--_button-fill: var(--helix-color-primary-surface);
--_button-fill-hover: var(--helix-color-primary-surface-hover);
--_button-on-tone: var(--helix-color-foreground-on-accent);
--_button-tone: var(--helix-color-primary);
--_button-tone-hover: var(--helix-color-primary-hover);
}

:host([tone="accent"]) {
--_button-edge: var(--helix-color-accent);
--_button-fill: var(--helix-color-accent-surface);
--_button-fill-hover: var(--helix-color-accent-surface-hover);
--_button-on-tone: var(--helix-color-foreground-on-accent);
--_button-tone: var(--helix-color-accent);
--_button-tone-hover: var(--helix-color-accent-hover);
}
:host([tone="danger"]) {
--_button-edge: var(--helix-color-danger);
--_button-fill: var(--helix-color-danger-surface);
--_button-fill-hover: var(--helix-color-danger-surface-hover);
--_button-on-tone: var(--helix-color-foreground-on-accent);
--_button-tone: var(--helix-color-danger);

--_button-tone-hover: color-mix(
in oklab,
var(--helix-color-danger) 86%,
var(--helix-color-foreground)
);
}

[part="button"] {
all: unset;
align-items: center;

background-color: var(
--button-background-color,
color-mix(in oklab, var(--_button-tone) 6%, transparent)
);

block-size: var(--button-size, var(--helix-size-control));
border: var(--helix-border-thin) solid var(--_button-edge);
box-sizing: border-box;
color: var(--button-foreground-color, var(--_button-tone));
cursor: pointer;
display: inline-flex;
font-family: var(--helix-font-sans);
font-size: var(--helix-text-control);
font-weight: var(--helix-weight-medium);
gap: var(--helix-space-xs);
inline-size: 100%;
justify-content: center;
letter-spacing: var(--helix-tracking-normal);
line-height: var(--helix-leading-tight);
padding-inline: var(--helix-space-control);
text-decoration: none;
transition:
background-color var(--helix-duration-fast) var(--helix-easing-standard),
border-color var(--helix-duration-fast) var(--helix-easing-standard),
color var(--helix-duration-fast) var(--helix-easing-standard);
white-space: nowrap;
}

[part="button"] {
border-end-end-radius: var(
--button-radii-end-end,
var(--button-radii-end, var(--button-radii, var(--helix-radii-sm)))
);
border-end-start-radius: var(
--button-radii-end-start,
var(--button-radii-start, var(--button-radii, var(--helix-radii-sm)))
);
border-start-end-radius: var(
--button-radii-start-end,
var(--button-radii-end, var(--button-radii, var(--helix-radii-sm)))
);
border-start-start-radius: var(
--button-radii-start-start,
var(--button-radii-start, var(--button-radii, var(--helix-radii-sm)))
);
}

:host(:not(:disabled)) [part="button"]:hover {
background-color: var(
--button-background-color-hover,
var(--button-background-color, color-mix(in oklab, var(--_button-tone) 12%, transparent))
);
}

[part="button"]:focus-visible {
outline: var(--helix-size-focus-ring) solid var(--helix-color-focus-ring);
outline-offset: var(--helix-size-focus-offset);
}

:host([emphasis="solid"]) [part="button"] {
background-color: var(--button-background-color, var(--_button-fill));
border-color: transparent;
color: var(--button-foreground-color, var(--_button-on-tone));
}
:host(:not(:disabled)[emphasis="solid"]) [part="button"]:hover {
background-color: var(
--button-background-color-hover,
var(--button-background-color, var(--_button-fill-hover))
);
border-color: transparent;
}

:host([emphasis="subtle"]) [part="button"] {
background-color: var(
--button-background-color,
color-mix(in oklab, var(--_button-tone) 14%, transparent)
);
border-color: transparent;
color: var(--button-foreground-color, var(--_button-tone));
}

:host(:not(:disabled)[emphasis="subtle"]) [part="button"]:hover {
background-color: var(
--button-background-color-hover,
var(--button-background-color, color-mix(in oklab, var(--_button-tone) 22%, transparent))
);
border-color: transparent;
}
:host([emphasis="ghost"]) [part="button"] {
background-color: var(--button-background-color, transparent);
border-color: transparent;
color: var(--button-foreground-color, var(--_button-tone));
}

:host(:not(:disabled)[emphasis="ghost"]) [part="button"]:hover {
background-color: var(
--button-background-color-hover,
var(--button-background-color, color-mix(in oklab, var(--_button-tone) 8%, transparent))
);
border-color: transparent;
}

:host([width="standard"]) {

min-inline-size: var(--button-inline-size, var(--helix-size-button));

max-inline-size: 100%;
}

:host([width="full"]) {
display: flex;
inline-size: 100%;
}

:host(:disabled) [part="button"] {
cursor: not-allowed;
opacity: 0.5;
}

[part="button"] ::slotted(helix-icon) {
--icon-size: 1.15em;
}

@media (prefers-reduced-motion: reduce) {
[part="button"] {
transition: none;
}
}

@media print {
:host {
display: none;
}
}`);var YK=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},LZ=class W extends n8(V0){static{this.styles=ZK}};YK([q({reflect:!0})],LZ.prototype,"width",void 0);LZ=YK([G("helix-button")],LZ);var MZ=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},l8=class W extends A{constructor(){super(...arguments);this.label=""}willUpdate(J){super.willUpdate(J),L(this.internals,{label:this.label,role:"group"})}render(){return F`<slot></slot>`}};MZ([q()],l8.prototype,"label",void 0);MZ([q({reflect:!0})],l8.prototype,"orientation",void 0);l8=MZ([G("helix-headless-button-group")],l8);var WK=N(`:host {
display: inline-flex;
}

:host(:not([variant="spaced"])) ::slotted(*:not(:first-child)) {
margin-inline-start: calc(var(--helix-border-thin) * -1);
}

:host(:not([variant="spaced"])) ::slotted(*:not(:first-child)) {
--button-radii-start: 0;
}

:host(:not([variant="spaced"])) ::slotted(*:not(:last-child)) {
--button-radii-end: 0;
}

:host([orientation="vertical"]) {
align-items: stretch;
flex-direction: column;
}

:host([orientation="vertical"]:not([variant="spaced"])) ::slotted(*:not(:first-child)) {
margin-block-start: calc(var(--helix-border-thin) * -1);

margin-inline-start: 0;
--button-radii-start-start: 0;
--button-radii-start-end: 0;
--button-radii-start: var(--button-radii, var(--helix-radii-sm));
}

:host([orientation="vertical"]:not([variant="spaced"])) ::slotted(*:not(:last-child)) {
--button-radii-end-end: 0;
--button-radii-end-start: 0;
--button-radii-end: var(--button-radii, var(--helix-radii-sm));
}

::slotted(*:hover),
::slotted(*:focus-within) {
position: relative;

z-index: var(--helix-layer-raised);
}

:host([variant="spaced"]) {
gap: var(--button-group-gap, var(--helix-space-xs));
}

@media print {
:host {
display: none;
}
}`);var KK=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},SZ=class W extends l8{static{this.styles=WK}};KK([q({reflect:!0})],SZ.prototype,"variant",void 0);SZ=KK([G("helix-button-group")],SZ);var QK=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},q9=class W extends A{willUpdate(J){super.willUpdate(J),L(this.internals,{role:"note"})}renderIcon(J,Z){return F`<slot name="icon">
      <svg part="icon-mark" fill="currentColor" viewBox=${J.viewBox} role="img" aria-label=${Z}>
        ${S(J.content)}
      </svg>
    </slot>`}render(){let{icon:J,label:Z}=t5(this.tone)??p8.info;return F`<span part="icon">${this.renderIcon(J,Z)}</span>
      <div part="content">
        <slot name="title"></slot>
        <slot></slot>
      </div>`}};QK([q({reflect:!0})],q9.prototype,"tone",void 0);q9=QK([G("helix-headless-callout")],q9);var XK=N(`:host {

font-size: var(--helix-text-sm);
background-color: var(
--callout-background-color,
color-mix(in oklab, var(--_callout-color) 10%, transparent)
);
overflow: hidden;
position: relative;

border-radius: var(--callout-radii, var(--helix-radii-sm));
color: var(--helix-color-foreground);
display: flex;
gap: var(--helix-space-sm);

padding: var(--helix-space-md);
padding-inline-start: calc(var(--helix-space-md) + var(--helix-border-thick));

--_callout-color: var(--helix-color-info);
}

:host::before {
background-color: var(--_callout-color);
content: "";
inline-size: var(--helix-border-thick);
inset-block: 0;
inset-inline-start: 0;
position: absolute;
}

:host([tone="success"]) {
--_callout-color: var(--helix-color-success);
}

:host([tone="warning"]) {
--_callout-color: var(--helix-color-warning);
}

:host([tone="danger"]) {
--_callout-color: var(--helix-color-danger);
}

[part="icon"] {
color: var(--_callout-color);
display: inline-flex;
flex: 0 0 auto;
}

[part="icon"] svg {
block-size: var(--helix-size-icon);
inline-size: var(--helix-size-icon);
}

slot[name="icon"]::slotted(*) {
--icon-size: var(--helix-size-icon);

block-size: var(--helix-size-icon);
inline-size: var(--helix-size-icon);
}

[part="content"] {
line-height: var(--helix-leading-normal);
min-inline-size: 0;
}

slot[name="title"]::slotted(*) {
color: var(--helix-color-foreground);

display: block;
font-size: var(--helix-text-sm);
font-weight: var(--helix-weight-semibold);
margin: var(--helix-space-none);
}

@media print {
:host {
background-color: transparent;
box-shadow: none;
}
}`);var Gz=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},$K=class W extends q9{static{this.styles=XK}};$K=Gz([G("helix-callout")],$K);var qK=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},G9=class W extends A{willUpdate(J){super.willUpdate(J),L(this.internals,{role:"group"})}render(){return F`
      <slot name="media"></slot>
      <slot name="header"></slot>
      <slot></slot>
      <slot name="footer"></slot>
    `}};qK([q({attribute:"media-placement",reflect:!0})],G9.prototype,"mediaPlacement",void 0);G9=qK([G("helix-headless-card")],G9);var GK=N(`:host {
background-color: var(--card-background-color, var(--helix-color-surface));
border: var(--card-border-width, var(--helix-border-surface)) solid
var(--card-border-color, var(--helix-color-border));

border-radius: var(--card-radii, var(--helix-radii-lg));

box-shadow: var(--card-shadow, var(--helix-shadow-surface));
color: var(--helix-color-foreground-muted);

align-content: var(--card-align, start);
display: grid;
gap: var(--helix-space-sm);
grid-template-columns: minmax(0, 1fr);
line-height: var(--helix-leading-normal);

overflow: hidden;
padding: var(--_card-inset);
transition:
border-color var(--helix-duration-fast) var(--helix-easing-standard),
box-shadow var(--helix-duration-fast) var(--helix-easing-standard);

--_card-inset: var(--card-padding, var(--helix-space-control));

--_card-media: var(--card-media-size, 12rem);
}

:host([separation="elevated"]) {
border-color: transparent;

--card-shadow: var(--helix-shadow-md);
}

:host([separation="filled"]) {
border-color: transparent;

--card-shadow: none;
}

:host([separation="plain"]) {
background-color: transparent;
border-color: transparent;
}

slot[name="media"]::slotted(*) {

block-size: var(--card-media-block-size, auto);
display: block;
inline-size: calc(100% + var(--_card-inset) * 2);
margin: calc(var(--_card-inset) * -1);
margin-block-end: 0;
object-fit: cover;
}

:host([media-placement="end"]) slot[name="media"]::slotted(*) {
margin-block-end: calc(var(--_card-inset) * -1);
margin-block-start: 0;
order: 1;
}

slot[name="header"]::slotted(*) {
color: var(--helix-color-foreground);
}

slot[name="footer"]::slotted(*) {
justify-self: end;
}

:host([orientation="horizontal"]) {
padding-inline-start: calc(var(--_card-media) + var(--_card-inset));
position: relative;
}

:host([orientation="horizontal"]) slot[name="media"]::slotted(*) {
block-size: 100%;
inline-size: var(--_card-media);
inset-block: 0;
inset-inline-start: 0;
margin: var(--helix-space-none);
position: absolute;
}

@media (prefers-reduced-motion: reduce) {
:host {
transition: none;
}
}

:host([material="glass"]) {
backdrop-filter: var(--card-backdrop, var(--helix-material-backdrop));
background-color: var(--card-background-color, var(--helix-material-translucent));
}

:host([material="frosted"]) {
backdrop-filter: var(--card-backdrop, blur(var(--helix-material-blur-lg)));
background-color: var(--card-background-color, var(--helix-material-translucent-strong));
}

:host([material="transparent"]) {
backdrop-filter: none;
background-color: transparent;
}

@media print {
:host {
background-color: transparent;
box-shadow: none;
}
}`);var x6=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},z9=class W extends G9{static{this.styles=GK}};x6([q({reflect:!0})],z9.prototype,"separation",void 0);x6([q({reflect:!0})],z9.prototype,"material",void 0);x6([q({reflect:!0})],z9.prototype,"orientation",void 0);z9=x6([G("helix-card")],z9);var Z1=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},I0=class W extends A{constructor(){super(...arguments);this.label="Carousel",this.defaultIndex=0,this.indexState=void 0,this.loop=!1,this.autoplay=!1,this.interval=5000,this.rotating=!1,this.handleIndicatorKeydown=(J)=>{let Z=J.key==="ArrowRight"?1:J.key==="ArrowLeft"?-1:0;if(Z===0)return;J.preventDefault(),this.goTo(this.index+Z),this.updateComplete.then(()=>{this.renderRoot.querySelector('[part="indicator"][data-current]')?.focus()})},this.settling=!1,this.handleTake=()=>{this.settling=!1},this.handleTrackScroll=()=>{if(this.settling||this.scrollFrame)return;this.scrollFrame=requestAnimationFrame(()=>{this.scrollFrame=0;let J=this.nearest();if(J!==void 0&&J!==this.showing)this.showing=J})},this.handleScroll=()=>{if(this.settling){this.settling=!1;return}this.showing=void 0;let J=this.nearest();if(J===void 0)return;if(J===this.index)return;this.indexState=J,this.requestUpdate("index"),this.dispatchEvent(new m({value:String(J)}))},this.scrollFrame=0,this.stopped=!1,this.watcher=void 0,this.pause=()=>{if(!this.stopped)this.rotating=!1}}static{this.shadowRootOptions={...A.shadowRootOptions,slotAssignment:"manual"}}get index(){return this.indexState??this.defaultIndex}set index(J){let Z=this.index;this.indexState=J,this.requestUpdate("index",Z)}get positions(){let J=Math.max(1,Math.floor(this.perView??1));return Math.max(1,this.slides.length-J+1)}get panes(){return[...this.renderRoot?.querySelectorAll?.('[part="slide"]')??[]]}get slides(){return[...this.children??[]].filter((J)=>J instanceof HTMLElement)}goTo(J){if(this.slides.length===0)return;let Z=this.positions,K=this.loop?(J+Z)%Z:Math.min(Math.max(J,0),Z-1);if(K===this.index)return;h({apply:(Q)=>{let Y=this.index;this.indexState=Q,this.requestUpdate("index",Y)},event:(Q)=>new m({value:String(Q)}),host:this,next:K})}bleed(J){let Z=getComputedStyle(J),K=Number.parseFloat(this.orientation==="vertical"?Z.paddingTop:Z.paddingLeft);return Number.isNaN(K)?0:K}edgeOf(J,Z,K){return this.orientation==="vertical"?J.offsetTop-Z.offsetTop-K:J.offsetLeft-Z.offsetLeft-K}scrollToIndex(){let J=this.panes[this.index],Z=this.renderRoot.querySelector('[part="track"]');if(!J||!Z)return;let K=this.orientation==="vertical",Q=this.edgeOf(J,Z,this.bleed(Z));if(Math.abs(Q-(K?Z.scrollTop:Z.scrollLeft))<1)return;let Y=globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1;this.settling=!0,Z.scrollTo({behavior:Y?"instant":"smooth",...K?{top:Q}:{left:Q}})}stop(){this.stopped=!0,this.rotating=!1}start(){this.stopped=!1,this.rotating=!0}runTimer(){if(clearInterval(this.timer),this.timer=void 0,!this.rotating||this.slides.length<2)return;this.timer=setInterval(()=>this.goTo(this.index+1),this.interval)}nearest(){let J=this.renderRoot.querySelector('[part="track"]');if(!J)return;let Z=this.bleed(J),K=this.orientation==="vertical"?J.scrollTop:J.scrollLeft;return this.panes.slice(0,this.positions).reduce((Q,Y,X)=>{let $=Math.abs(this.edgeOf(Y,J,Z)-K);return $<Q.distance?{distance:$,index:X}:Q},{distance:Number.POSITIVE_INFINITY,index:this.index}).index}connectedCallback(){super.connectedCallback(),this.addEventListener("focusin",this.pause),this.addEventListener("pointerenter",this.pause),this.watcher=new MutationObserver(()=>this.requestUpdate()),this.watcher.observe(this,{childList:!0})}disconnectedCallback(){if(super.disconnectedCallback(),this.scrollFrame)cancelAnimationFrame(this.scrollFrame),this.scrollFrame=0;this.removeEventListener("focusin",this.pause),this.removeEventListener("pointerenter",this.pause),this.watcher?.disconnect(),this.watcher=void 0,clearInterval(this.timer),this.timer=void 0}willUpdate(J){if(super.willUpdate(J),!this.hasUpdated)this.rotating=this.autoplay;L(this.internals,{label:this.label,role:"group"}),this.internals.ariaRoleDescription="carousel"}updated(J){if(super.updated(J),J.has("index"))this.scrollToIndex();this.runTimer();let Z=this.slides.length;if(Z>0&&this.index>Z-1)this.goTo(Z-1);this.assign()}assign(){let J=this.renderRoot?.querySelectorAll?.('[part="slide"] slot');if(!J)return;this.slides.forEach((Z,K)=>{J[K]?.assign?.(Z)})}render(){let J=this.rotating;return F`<div part="controls">
        ${this.autoplay?F`<button
                part="rotation"
                type="button"
                aria-label=${J?"Stop slide rotation":"Start slide rotation"}
                @click=${()=>J?this.stop():this.start()}
              >
                <svg part="rotation-mark"
                  fill="currentColor"
                  viewBox=${J?r5.viewBox:mJ.viewBox}
                  aria-hidden="true"
                >
                  ${S(J?r5.content:mJ.content)}
                </svg>
              </button>`:z}
        ${this.controls==="none"?z:F`<button
                  part="previous"
                  type="button"
                  aria-label="Previous slide"
                  @click=${()=>this.goTo(this.index-1)}
                >
                  <svg part="previous-mark" fill="currentColor" viewBox=${N0.viewBox} aria-hidden="true">
                    ${S(N0.content)}
                  </svg>
                </button>
                <button
                  part="next"
                  type="button"
                  aria-label="Next slide"
                  @click=${()=>this.goTo(this.index+1)}
                >
                  <svg part="next-mark" fill="currentColor" viewBox=${O0.viewBox} aria-hidden="true">
                    ${S(O0.content)}
                  </svg>
                </button>`}
      </div>
      <div
        data-scroller
        part="track"
        @scroll=${this.handleTrackScroll}
        @scrollend=${this.handleScroll}
        @pointerdown=${this.handleTake}
        @touchstart=${this.handleTake}
        @wheel=${this.handleTake}
      >
        ${this.slides.map((Z,K)=>F`<div
            part="slide"
            role="group"
            aria-roledescription="slide"
            aria-label=${`${K+1} of ${this.slides.length}`}
          >
            <slot @slotchange=${()=>this.requestUpdate()}></slot>
          </div>`)}
      </div>
      ${this.slides.length>1?F`<div part="indicators" role="group" aria-label=${`${this.label} slides`}>
              ${""}
              ${Array.from({length:this.positions}).map((Z,K)=>F`<button
                  part="indicator"
                  type="button"
                  aria-label=${`Slide ${K+1}`}
                  aria-current=${K===this.index?"true":z}
                  tabindex=${K===this.index?"0":"-1"}
                  ?data-current=${K===(this.showing??this.index)}
                  @keydown=${this.handleIndicatorKeydown}
                  @click=${()=>this.goTo(K)}
                ></button>`)}
            </div>`:z}`}};Z1([q()],I0.prototype,"label",void 0);Z1([q({type:Number})],I0.prototype,"index",null);Z1([q({reflect:!0})],I0.prototype,"orientation",void 0);Z1([q({reflect:!0})],I0.prototype,"controls",void 0);Z1([q({attribute:"default-index",type:Number})],I0.prototype,"defaultIndex",void 0);Z1([q({type:Boolean})],I0.prototype,"loop",void 0);Z1([q({type:Boolean})],I0.prototype,"autoplay",void 0);Z1([q({type:Number})],I0.prototype,"interval",void 0);Z1([U()],I0.prototype,"rotating",void 0);Z1([q({attribute:"per-view",reflect:!0,type:Number})],I0.prototype,"perView",void 0);Z1([U()],I0.prototype,"showing",void 0);I0=Z1([G("helix-headless-carousel")],I0);var zK=N(`:host {
display: block;

--_carousel-bleed: var(--carousel-bleed, var(--helix-space-md));
--_carousel-gap: var(--carousel-gap, var(--helix-space-md));
--_carousel-per-view: 1;
}

:host {
display: grid;
grid-template-columns: auto minmax(0, 1fr) auto;
grid-template-rows: auto minmax(0, 1fr) auto;
}

[part="track"] {
grid-area: 2 / 2;
}

[part="controls"],
[part="indicators"] {
align-items: center;
display: flex;
gap: var(--helix-space-2xs);
}

[part="indicators"] {
grid-area: 3 / 2;
justify-self: var(--_carousel-indicators-along);
padding-block-start: var(--helix-space-sm);
padding-inline: var(--_carousel-bleed);
}

[part="controls"] {
grid-area: 3 / 2;
justify-self: var(--_carousel-controls-along);
padding-block-start: var(--helix-space-sm);
padding-inline: var(--_carousel-bleed);
}

[part="indicators"] {
--_carousel-indicators-along: start;
}

[part="controls"] {
--_carousel-controls-along: end;
}

@media (hover: none) and (pointer: coarse) {

:host(:not([controls="always"])) [part="indicators"] {
--_carousel-indicators-along: center;
}
}

:host([indicator-placement="block-start"]) [part="indicators"] {
grid-area: 1 / 2;
padding-block: var(--helix-space-none) var(--helix-space-sm);
}

:host([controls-placement="block-start"]) [part="controls"] {
grid-area: 1 / 2;
padding-block: var(--helix-space-none) var(--helix-space-sm);
}

:host([indicator-placement="inline-start"]) [part="indicators"],
:host([indicator-placement="inline-end"]) [part="indicators"] {
align-self: var(--_carousel-indicators-along);
flex-direction: column;
justify-self: center;
padding-block-start: var(--helix-space-none);
padding-inline: var(--helix-space-none);
}

:host([controls-placement="inline-start"]) [part="controls"],
:host([controls-placement="inline-end"]) [part="controls"] {
align-self: var(--_carousel-controls-along);
flex-direction: column;
justify-self: center;
padding-block-start: var(--helix-space-none);
padding-inline: var(--helix-space-none);
}

:host([indicator-placement="inline-start"]) [part="indicators"],
:host([indicator-placement="inline-end"]) [part="indicators"] {
--_carousel-indicators-along: center;
}

:host([controls-placement="inline-start"]) [part="controls"],
:host([controls-placement="inline-end"]) [part="controls"],
:host([controls-placement="overlay"]) [part="controls"] {
--_carousel-controls-along: center;
}

:host([indicator-align="start"]) [part="indicators"] {
--_carousel-indicators-along: start;
}

:host([indicator-align="center"]) [part="indicators"] {
--_carousel-indicators-along: center;
}

:host([indicator-align="end"]) [part="indicators"] {
--_carousel-indicators-along: end;
}

:host([controls-align="start"]) [part="controls"] {
--_carousel-controls-along: start;
}

:host([controls-align="center"]) [part="controls"] {
--_carousel-controls-along: center;
}

:host([controls-align="end"]) [part="controls"] {
--_carousel-controls-along: end;
}

:host([indicator-placement="inline-start"]) [part="indicators"] {
grid-area: 2 / 1;
padding-inline-end: var(--helix-space-sm);
}

:host([controls-placement="inline-start"]) [part="controls"] {
grid-area: 2 / 1;
padding-inline-end: var(--helix-space-sm);
}

:host([indicator-placement="inline-end"]) [part="indicators"] {
grid-area: 2 / 3;
padding-inline-start: var(--helix-space-sm);
}

:host([controls-placement="inline-end"]) [part="controls"] {
grid-area: 2 / 3;
padding-inline-start: var(--helix-space-sm);
}

[part="rotation"],
[part="previous"],
[part="next"] {
all: unset;

box-sizing: border-box;
align-items: center;
block-size: var(--helix-size-control-sm);
border: var(--helix-border-thin) solid var(--helix-color-border);
border-radius: var(--helix-radii-sm);
color: var(--helix-color-foreground-muted);
cursor: pointer;
display: inline-flex;
inline-size: var(--helix-size-control-sm);
justify-content: center;
}

[part="rotation"]:hover,
[part="previous"]:hover,
[part="next"]:hover {
background-color: var(--helix-color-surface-sunken);
color: var(--helix-color-foreground);
}

[part="rotation"]:focus-visible,
[part="previous"]:focus-visible,
[part="next"]:focus-visible {
outline: var(--helix-size-focus-ring) solid var(--helix-color-focus-ring);
outline-offset: var(--helix-size-focus-offset);
}

[part="rotation"] svg,
[part="previous"] svg,
[part="next"] svg {
block-size: 1em;
inline-size: 1em;
}

[part="track"] {
display: flex;
gap: var(--_carousel-gap);
overflow-x: auto;

padding-block: var(--helix-space-md);
padding-inline: var(--_carousel-bleed);
scroll-padding-inline: var(--_carousel-bleed);
scroll-snap-type: x mandatory;
scrollbar-width: none;
}

[part="track"]::-webkit-scrollbar {
display: none;
}

:host([orientation="vertical"]) [part="track"] {
block-size: var(--carousel-block-size, 20rem);
flex-direction: column;
overflow-x: hidden;
overflow-y: auto;
scroll-snap-type: y mandatory;
}

[part="slide"] {
display: flex;
flex: 0 0
calc(
(100% - (var(--_carousel-per-view) - 1) * var(--_carousel-gap)) /
var(--_carousel-per-view)
);
scroll-snap-align: start;
}

[part="slide"] ::slotted(*) {
flex: 1 1 0;
min-block-size: 0;
min-inline-size: 0;
}

:host([orientation="vertical"]) [part="slide"] {
flex-direction: column;
flex: 0 0
calc(
(100% - (var(--_carousel-per-view) - 1) * var(--_carousel-gap)) /
var(--_carousel-per-view)
);
}

:host([per-view="2"]) {
--_carousel-per-view: 2;
}

:host([per-view="3"]) {
--_carousel-per-view: 3;
}

:host([per-view="4"]) {
--_carousel-per-view: 4;
}

:host([per-view="5"]) {
--_carousel-per-view: 5;
}

[part="indicator"] {
all: unset;
background-color: var(--helix-color-border);
block-size: var(--helix-space-xs);
border-radius: var(--helix-radii-full);
box-sizing: border-box;
cursor: pointer;
inline-size: var(--helix-space-xs);
transition:
background-color var(--_carousel-indicator-motion),
inline-size var(--_carousel-indicator-motion);

--_carousel-indicator-motion: var(--helix-duration-slow) var(--helix-easing-emphasized);
}

[part="indicator"][data-current] {
background-color: var(--helix-color-primary);
inline-size: var(--helix-space-lg);
}

:host([indicator-placement="inline-start"]) [part="indicator"],
:host([indicator-placement="inline-end"]) [part="indicator"] {
transition:
background-color var(--_carousel-indicator-motion),
block-size var(--_carousel-indicator-motion);
}

:host([indicator-placement="inline-start"]) [part="indicator"][data-current],
:host([indicator-placement="inline-end"]) [part="indicator"][data-current] {
block-size: var(--helix-space-lg);
inline-size: var(--helix-space-xs);
}

[part="indicator"]:hover {
background-color: var(--helix-color-foreground-muted);
}

[part="indicator"]:focus-visible {
outline: var(--helix-size-focus-ring) solid var(--helix-color-focus-ring);
outline-offset: var(--helix-size-focus-offset);
}

:host([controls-placement="overlay"]) [part="controls"] {
grid-area: 2 / 2;
justify-self: stretch;
}

:host([controls-placement="overlay"]) [part="controls"] {
align-items: var(--_carousel-controls-along);

justify-content: flex-start;
padding-block-start: var(--helix-space-none);
padding-inline: var(--helix-space-md);
pointer-events: none;
z-index: var(--helix-layer-raised);
}

:host([controls-placement="overlay"]) [part="previous"],
:host([controls-placement="overlay"]) [part="next"],
:host([controls-placement="overlay"]) [part="rotation"] {
background-color: var(--helix-color-surface-overlay);
border-color: transparent;
box-shadow: var(--helix-shadow-md);
pointer-events: auto;
}

:host([controls-placement="overlay"]) [part="next"] {
margin-inline-start: auto;
}

:host([controls-placement="overlay"]) [part="rotation"] {
order: 1;
}

@media (prefers-reduced-motion: reduce) {
[part="indicator"],
:host([indicator-placement="inline-start"]) [part="indicator"],
:host([indicator-placement="inline-end"]) [part="indicator"] {
transition: none;
}
}

:host(:dir(rtl)) [part="previous"] svg,
:host(:dir(rtl)) [part="next"] svg {
scale: -1 1;
}

@media print {
:host {
box-shadow: none;
max-block-size: none;
overflow: visible;
}
}

@media (hover: none) and (pointer: coarse) {
:host(:not([controls="always"])) [part="previous"],
:host(:not([controls="always"])) [part="next"] {
display: none;
}

:host(:not([controls="always"]):not([autoplay])) [part="controls"] {
display: none;
}
}`);var V9=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},c8=class W extends I0{static{this.styles=zK}};V9([q({attribute:"indicator-placement",reflect:!0})],c8.prototype,"indicatorPlacement",void 0);V9([q({attribute:"indicator-align",reflect:!0})],c8.prototype,"indicatorAlign",void 0);V9([q({attribute:"controls-placement",reflect:!0})],c8.prototype,"controlsPlacement",void 0);V9([q({attribute:"controls-align",reflect:!0})],c8.prototype,"controlsAlign",void 0);c8=V9([G("helix-carousel")],c8);var ZJ=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},d0=class W extends A{constructor(){super(...arguments);this.value="",this.placeholder="",this.submitOn="enter",this.disabled=!1,this.label="Message",this.sendLabel="Send",this.rows=1,this.draft="",this.isChatComposer=!0,this.handleInput=(J)=>{J.stopPropagation(),this.draft=J.target.value},this.handleSend=()=>{this.send()},this.handleKey=(J)=>{if(J.key!=="Enter"||this.submitOn!=="enter")return;if(J.shiftKey||J.isComposing)return;J.preventDefault(),this.send()}}get text(){return this.draft||this.value}send(){let J=this.text.trim();if(J===""||this.disabled)return!1;if(!this.dispatchEvent(new fJ({value:J})))return!1;return this.draft="",this.value="",!0}markEmpty(){for(let J of["start","end"]){let Z=this.renderRoot?.querySelector(`[part="${J}"]`),K=!o(this.renderRoot?.querySelector(`slot[name="${J}"]`));Z?.toggleAttribute("data-empty",K),Z?.toggleAttribute("hidden",K)}}updated(J){super.updated(J),this.markEmpty()}willUpdate(J){super.willUpdate(J),L(this.internals,{label:this.label,role:"group"})}renderSend(){return F`<button
      part="send"
      type="button"
      aria-label=${this.sendLabel}
      ?disabled=${this.disabled}
      @click=${this.handleSend}
    >
      <svg
        part="mark"
        fill="currentColor"
        viewBox=${g5.viewBox}
        aria-hidden="true"
      >
        ${S(g5.content)}
      </svg>
    </button>`}render(){return F`<div part="composer">
      <textarea
        part="field"
        .value=${this.text}
        aria-label=${this.label}
        placeholder=${this.placeholder}
        rows=${this.rows}
        ?disabled=${this.disabled}
        @input=${this.handleInput}
        @keydown=${this.handleKey}
      ></textarea>
      <div part="tools">
        <span part="start"><slot name="start"></slot></span>
        <span part="end"><slot name="end"></slot></span>
        ${this.renderSend()}
      </div>
    </div>`}};ZJ([q()],d0.prototype,"value",void 0);ZJ([q()],d0.prototype,"placeholder",void 0);ZJ([q({attribute:"submit-on"})],d0.prototype,"submitOn",void 0);ZJ([q({reflect:!0,type:Boolean})],d0.prototype,"disabled",void 0);ZJ([q()],d0.prototype,"label",void 0);ZJ([q({attribute:"send-label"})],d0.prototype,"sendLabel",void 0);ZJ([q({type:Number})],d0.prototype,"rows",void 0);ZJ([U()],d0.prototype,"draft",void 0);d0=ZJ([G("helix-headless-chat-composer")],d0);var YJ=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},i0=class W extends A{constructor(){super(...arguments);this.at="",this.locale="",this.sendingLabel="Sending",this.failedLabel="Not sent",this.retryLabel="Try again",this.isChatMessage=!0,this.clock=void 0,this.handleFill=()=>{this.markEmpty()},this.handleRetry=(J)=>{J.stopPropagation(),this.dispatchEvent(new fJ({value:this.textContent?.trim()??""}))}}get moment(){if(this.at==="")return;let J=new Date(this.at);return Number.isNaN(J.getTime())?void 0:J}willUpdate(J){if(super.willUpdate(J),J.has("at"))this.clock=Date.now();L(this.internals,{role:"article"}),this.toggleAttribute("aria-busy",this.state==="streaming")}renderTime(){let J=this.moment;if(!J)return z;let{text:Z}=zZ(this.locale)(J,new Date(this.clock??Date.now()));return F`<time part="time" datetime=${J.toISOString()}>${Z}</time>`}renderMark(){let{icon:J,label:Z}=p8.danger;return F`<svg
      part="mark"
      fill="currentColor"
      viewBox=${J.viewBox}
      role="img"
      aria-label=${Z}
    >
      ${S(J.content)}
    </svg>`}renderState(){if(this.state==="sending")return F`<span part="state">${this.sendingLabel}</span>`;if(this.state!=="failed")return z;return F`<span part="state"
      >${this.renderMark()} ${this.failedLabel}
      <button part="retry" type="button" @click=${this.handleRetry}>${this.retryLabel}</button>
    </span>`}markEmpty(){for(let J of["content","sources","actions"]){let Z=this.renderRoot?.querySelector(`[part="${J}"]`),K=J==="content"?this.renderRoot?.querySelector("slot:not([name])"):this.renderRoot?.querySelector(`slot[name="${J}"]`),Q=!o(K);if(Z?.toggleAttribute("data-empty",Q),J!=="content")Z?.toggleAttribute("hidden",Q)}}updated(J){super.updated(J),this.markEmpty()}render(){return F`<div part="message">
      <span part="avatar"><slot name="avatar"></slot></span>
      <div part="body">
        <div part="content"><slot @slotchange=${this.handleFill}></slot></div>
        <div part="sources"><slot name="sources" @slotchange=${this.handleFill}></slot></div>
        <span part="meta"
          >${this.renderTime()} ${this.renderState()}
          <span part="actions"><slot name="actions" @slotchange=${this.handleFill}></slot></span>
        </span>
      </div>
    </div>`}};YJ([q({reflect:!0})],i0.prototype,"author",void 0);YJ([q({reflect:!0})],i0.prototype,"state",void 0);YJ([q()],i0.prototype,"at",void 0);YJ([q()],i0.prototype,"locale",void 0);YJ([q({attribute:"sending-label"})],i0.prototype,"sendingLabel",void 0);YJ([q({attribute:"failed-label"})],i0.prototype,"failedLabel",void 0);YJ([q({attribute:"retry-label"})],i0.prototype,"retryLabel",void 0);YJ([U()],i0.prototype,"clock",void 0);i0=YJ([G("helix-headless-chat-message")],i0);var u7=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},zz=["header","actions","resume","status","composer"],P1=class W extends z0(A){constructor(){super(...arguments);this.label="",this.threshold=48,this.defaultPinned=!0,this.pinnedState=void 0,this.watcher=void 0,this.filled=void 0,this.handleResume=()=>{this.resume()},this.handleSlotChange=()=>{this.assign(),this.requestUpdate()},this.handleScroll=()=>{let J=this.atBottom;if(J!==this.pinned)this.requestPinned(J)}}static{this.shadowRootOptions={...A.shadowRootOptions,slotAssignment:"manual"}}get pinned(){return this.pinnedState??this.defaultPinned}set pinned(J){let Z=this.pinned;this.pinnedState=J,this.requestUpdate("pinned",Z)}has(J){return this.filled?.has(J)??!0}get messages(){return[...this.children??[]].filter((J)=>("isChatMessage"in J)&&J.isChatMessage===!0)}get log(){return this.renderRoot?.querySelector?.('[part="log"]')??null}get atBottom(){let J=this.log;if(!J)return!0;return J.scrollHeight-J.scrollTop-J.clientHeight<=Math.max(0,this.threshold)}resume(){let J=this.log;if(J)J.scrollTop=J.scrollHeight;this.requestPinned(!0)}requestPinned(J){if(J===this.pinned)return!1;return h({apply:(Z)=>{let K=this.pinned;this.pinnedState=Z,this.requestUpdate("pinned",K)},event:(Z)=>new F8({value:String(Z)}),host:this,next:J})}assign(){let J=this.renderRoot,Z=J?.querySelector?.('slot[name="messages"]');if(!Z?.assign)return;let K=this.messages;Z.assign(...K);let Q=new Set;for(let X of zz){let $=[...this.children].filter((V)=>V.getAttribute("slot")===X);if(J?.querySelector?.(`slot[name="${X}"]`)?.assign?.(...$),$.length>0)Q.add(X)}let Y=this.filled;if(!Y||Y.size!==Q.size||[...Q].some((X)=>!Y.has(X)))this.filled=Q}connectedCallback(){super.connectedCallback(),this.watcher=new MutationObserver(this.handleSlotChange),this.watcher.observe(this,{childList:!0})}disconnectedCallback(){super.disconnectedCallback(),this.watcher?.disconnect(),this.watcher=void 0}willUpdate(J){super.willUpdate(J),L(this.internals,{label:this.label||"Conversation",role:"region"})}updated(J){if(super.updated(J),this.assign(),this.pinned){let Z=this.log;if(Z)Z.scrollTop=Z.scrollHeight}}render(){let J=!this.pinned,Z=this.has("header")||this.has("actions");return F`<div part="header" ?hidden=${!Z}>
        <slot name="header"></slot>
        <span part="actions" ?hidden=${!this.has("actions")}>
          <slot name="actions"></slot>
        </span>
      </div>
      <div
        part="log"
        role="log"
        aria-live="polite"
        aria-label=${this.label||"Conversation"}
        aria-busy=${this.loading?"true":z}
        @scroll=${this.handleScroll}
      >
        <slot name="messages" @slotchange=${this.handleSlotChange}></slot>
        ${this.renderStatus(this.messages.length>0)}
      </div>
      <div part="resume" ?hidden=${!J||!this.has("resume")} @click=${this.handleResume}>
        <slot name="resume"></slot>
      </div>
      <div part="status" role="status" ?hidden=${!this.has("status")}>
        <slot name="status"></slot>
      </div>
      <div part="composer" ?hidden=${!this.has("composer")}>
        <slot name="composer"></slot>
      </div>`}};u7([q()],P1.prototype,"label",void 0);u7([q({type:Number})],P1.prototype,"threshold",void 0);u7([q({type:Boolean})],P1.prototype,"pinned",null);u7([q({attribute:"default-pinned",type:Boolean})],P1.prototype,"defaultPinned",void 0);u7([U()],P1.prototype,"pinnedState",void 0);u7([U()],P1.prototype,"filled",void 0);P1=u7([G("helix-headless-chat")],P1);var VK=N(`:host {
display: block;
}

[part="composer"] {
background-color: var(--chat-composer-background, var(--helix-color-surface));
border: var(--chat-composer-border-width, var(--helix-border-thin)) solid
var(--helix-color-border);
border-radius: var(--helix-radii-md);
display: grid;
gap: var(--helix-space-2xs);
padding: var(--helix-space-xs);
}

[part="composer"]:focus-within {
outline: var(--helix-size-focus-ring) solid var(--helix-color-focus-ring);
outline-offset: var(--helix-size-focus-offset);
}

[part="field"] {
background-color: transparent;
border: 0;
color: var(--helix-color-foreground);

field-sizing: content;
font-family: var(--helix-font-sans);
font-size: var(--helix-text-sm);
line-height: var(--helix-leading-normal);
max-block-size: var(--chat-composer-max-height, 12rem);
padding-block: var(--helix-space-2xs);
padding-inline: var(--helix-space-2xs);
resize: none;
}

[part="field"]:focus-visible {
outline: none;
}

[part="tools"] {
align-items: center;
display: flex;
gap: var(--helix-space-2xs);
justify-content: flex-end;
}

[part="start"],
[part="end"] {
--helix-size-control: var(--helix-size-control-sm);
--helix-size-icon: var(--helix-size-icon-sm);

align-items: center;
display: flex;
gap: var(--helix-space-2xs);
}

[part="start"] {
margin-inline-end: auto;
}

[part="end"] {
margin-inline-end: var(--helix-space-2xs);
}

[part="start"][data-empty],
[part="end"][data-empty] {
display: none;
}

[part="send"] {
align-items: center;
background-color: transparent;
block-size: calc(var(--helix-size-control-sm) - var(--helix-space-2xs));
border: 0;
border-radius: var(--helix-radii-sm);
color: var(--helix-color-foreground-muted);
cursor: pointer;
display: inline-flex;
inline-size: calc(var(--helix-size-control-sm) - var(--helix-space-2xs));
justify-content: center;
padding: var(--helix-space-none);
}

[part="mark"] {
block-size: var(--helix-size-icon-sm);
inline-size: var(--helix-size-icon-sm);
}

[part="send"]:hover:not(:disabled) {
background-color: color-mix(in oklab, var(--helix-color-foreground) 8%, transparent);
color: var(--helix-color-foreground);
}

[part="send"]:disabled {
cursor: not-allowed;
opacity: 0.5;
}

[part="send"]:focus-visible {
outline: var(--helix-size-focus-ring) solid var(--helix-color-focus-ring);
outline-offset: var(--helix-size-focus-offset);
}`);var Vz=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},RZ=class W extends d0{static{this.tier="helix-"}static{this.styles=VK}};RZ=Vz([G("helix-chat-composer")],RZ);var FK=N(`:host {
display: block;
}

[part="message"] {
align-items: start;
display: grid;
grid-template-columns: auto minmax(0, 1fr);
}

[part="avatar"] > slot::slotted(*) {
margin-inline-end: var(--helix-space-sm);
}

[part="avatar"] {
align-items: center;
display: flex;
font-size: var(--helix-text-sm);
grid-column: 1;
line-height: var(--helix-leading-normal);
min-block-size: calc(1lh + var(--helix-space-xs) * 2);
}

[part="body"] {
grid-column: 2;
}

:host([author="me"]) [part="avatar"] {
display: none;
}

[part="body"] {
display: grid;
gap: var(--helix-space-2xs);

justify-items: start;

max-inline-size: min(var(--chat-message-measure, 42rem), 80%);
}

:host([author="me"]) [part="body"] {
justify-items: end;
justify-self: end;
}

[part="actions"] {
opacity: 0;
pointer-events: none;
transition: opacity var(--helix-duration-fast) var(--helix-easing-standard);
}

:host(:hover) [part="actions"],
:host(:focus-within) [part="actions"] {
opacity: 1;
pointer-events: auto;
}

@media (hover: none) {
[part="actions"] {
opacity: 1;
pointer-events: auto;
}
}

@media (prefers-reduced-motion: reduce) {
[part="actions"] {
transition: none;
}
}

[part="actions"] {

--helix-size-control: calc(var(--helix-size-control-sm) - var(--helix-space-2xs));
--helix-size-icon: var(--helix-size-icon-sm);

align-items: center;
display: inline-flex;
gap: var(--helix-space-2xs);
}

[part="actions"][hidden] {
display: none;
}

[part="sources"] {
--helix-size-avatar: var(--helix-size-avatar-sm);
--helix-size-tag: var(--helix-size-tag-sm);
--helix-size-icon: var(--helix-size-icon-sm);

align-items: center;
color: var(--helix-color-foreground-muted);
display: flex;
flex-wrap: wrap;
font-family: var(--helix-font-sans);
font-size: var(--helix-text-xs);
gap: var(--helix-space-2xs);
line-height: var(--helix-leading-normal);
}

[part="sources"][hidden] {
display: none;
}

[part="content"] {
background-color: var(
--chat-message-background,
color-mix(in oklab, var(--helix-color-foreground) 14%, transparent)
);
border-radius: var(--helix-radii-md);
color: var(--chat-message-color, var(--helix-color-foreground));
font-family: var(--helix-font-sans);
font-size: var(--helix-text-sm);
line-height: var(--helix-leading-normal);
padding-block: var(--helix-space-xs);
padding-inline: var(--helix-space-sm);
}

:host([separation="plain"]) [part="content"] {
background-color: transparent;
padding-inline: var(--helix-space-none);
}

:host([author="me"]) [part="content"] {
background-color: var(
--chat-message-background-me,
color-mix(in oklab, var(--helix-color-primary) 28%, transparent)
);
}

[part="meta"] {
align-items: center;
color: var(--helix-color-foreground-muted);
display: flex;
font-family: var(--helix-font-sans);
font-size: var(--helix-text-xs);
gap: var(--helix-space-2xs);
}

:host([author="me"]) [part="meta"] {
justify-content: flex-end;
}

[part="content"] {
inline-size: fit-content;
max-inline-size: 100%;
}

:host([state="streaming"]) [part="content"][data-empty]::after {
animation: helix-chat-typing 1.2s infinite ease-in-out;
background-image:
radial-gradient(circle closest-side, currentColor 90%, transparent),
radial-gradient(circle closest-side, currentColor 90%, transparent),
radial-gradient(circle closest-side, currentColor 90%, transparent);
background-position:
0% 50%,
50% 50%,
100% 50%;
background-repeat: no-repeat;
background-size:
20% 30%,
20% 30%,
20% 30%;
block-size: 1lh;
content: "";
display: block;
inline-size: 1.75em;
opacity: 0.7;
}

@keyframes helix-chat-typing {
0%,
60%,
100% {
background-position:
0% 50%,
50% 50%,
100% 50%;
}

20% {
background-position:
0% 10%,
50% 50%,
100% 50%;
}

33% {
background-position:
0% 50%,
50% 10%,
100% 50%;
}

46% {
background-position:
0% 50%,
50% 50%,
100% 10%;
}
}

@media (prefers-reduced-motion: reduce) {
:host([state="streaming"]) [part="content"][data-empty]::after {
animation: none;
}
}

:host([state="failed"]) [part="meta"] {
color: var(--helix-color-danger);
}

[part="state"] {
align-items: center;
display: inline-flex;
font-weight: var(--helix-weight-medium);
gap: var(--helix-space-2xs);
}

[part="mark"] {
block-size: var(--helix-size-icon-sm);
flex: 0 0 auto;
inline-size: var(--helix-size-icon-sm);
}

:host([state="sending"]) [part="content"] {
opacity: 0.6;
}

[part="retry"] {
background: none;
border: 0;
border-radius: var(--helix-radii-sm);
color: var(--helix-color-foreground);
cursor: pointer;
font: inherit;
font-weight: var(--helix-weight-medium);
min-block-size: calc(var(--helix-size-control-sm) - var(--helix-space-2xs));
padding-block: var(--helix-space-2xs);
padding-inline: var(--helix-space-2xs);
text-decoration: underline;
text-underline-offset: 0.2em;
}

[part="retry"]:hover {
background-color: light-dark(
color-mix(in oklab, var(--helix-color-foreground) 8%, transparent),
color-mix(in oklab, var(--helix-color-foreground) 12%, transparent)
);
}

[part="retry"]:focus-visible {
outline: var(--helix-size-focus-ring) solid var(--helix-color-focus-ring);
outline-offset: var(--helix-size-focus-offset);
}

@media print {
[part="retry"] {
display: none;
}

[part="actions"] {
display: none;
}

:host([state="streaming"]) [part="content"][data-empty]::after {
display: none;
}
}`);var NK=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},y6=class W extends i0{static{this.tier="helix-"}static{this.styles=FK}};NK([q({reflect:!0})],y6.prototype,"separation",void 0);y6=NK([G("helix-chat-message")],y6);var OK=N(`:host {
display: grid;
grid-template-rows: auto minmax(0, 1fr) auto auto auto;
max-block-size: var(--chat-max-height, none);
min-block-size: 0;
}

[part="header"] {
grid-row: 1;
}

[part="log"] {
grid-row: 2;
}

[part="resume"] {
grid-row: 3;
}

[part="status"] {
grid-row: 4;
}

[part="composer"] {
grid-row: 5;
}

[part="log"] {
display: flex;
flex-direction: column;
scrollbar-color: var(--helix-color-border) transparent;
scrollbar-width: thin;
gap: var(--chat-gap, var(--helix-space-md));
overflow-y: auto;
padding-block: var(--helix-space-md);
padding-inline: var(--chat-padding-inline, var(--helix-space-md));

justify-content: safe flex-end;
}

[part="header"][hidden],
[part="resume"][hidden],
[part="status"][hidden],
[part="composer"][hidden] {
display: none;
}

[part="header"] {

--helix-size-tag: var(--helix-size-tag-sm);

align-items: center;
border-block-end: var(--helix-border-thin) solid var(--chat-rule, var(--helix-color-border));
display: flex;
gap: var(--helix-space-sm);
justify-content: space-between;
min-block-size: var(--helix-size-control);
padding-block: var(--helix-space-2xs);
padding-inline: var(--chat-padding-inline, var(--helix-space-md));
}

[part="header"] > [part="actions"] {
--helix-size-control: var(--helix-size-control-sm);
--helix-size-icon: var(--helix-size-icon-sm);

align-items: center;
display: flex;
flex: 0 0 auto;
gap: var(--helix-space-2xs);
}

[part="header"] > [part="actions"][hidden] {
display: none;
}

[part="resume"] {
display: grid;
justify-items: center;
margin-block-start: calc(var(--helix-space-xl) * -1);
pointer-events: none;
position: relative;
}

[part="resume"] > * {
pointer-events: auto;
}

[part="resume"] slot::slotted(*) {

border: var(--chat-resume-border-width, var(--helix-border-floating)) solid
var(--chat-resume-border-color, var(--helix-color-border));
box-shadow: var(--chat-resume-shadow, var(--helix-shadow-floating));
}

[part="status"] {
color: var(--helix-color-foreground-muted);
font-family: var(--helix-font-sans);
font-size: var(--helix-text-xs);
padding-block-end: var(--helix-space-2xs);
padding-block-start: var(--helix-space-xs);
padding-inline: var(--chat-padding-inline, var(--helix-space-md));
}

[part="composer"] {
padding-block: var(--helix-space-sm);
padding-inline: var(--chat-padding-inline, var(--helix-space-md));
}

[part="empty"],
[part="loading"] {
color: var(--helix-color-foreground-subtle);
font-family: var(--helix-font-sans);
font-size: var(--helix-text-sm);
margin: var(--helix-space-none);
padding-block: var(--helix-space-lg);
text-align: center;
}

@media print {
:host {
max-block-size: none;
}

[part="log"] {
overflow-y: visible;
}

[part="composer"],
[part="resume"] {
display: none;
}
}`);var Fz=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},EZ=class W extends P1{static{this.tier="helix-"}static{this.styles=OK}};EZ=Fz([G("helix-chat")],EZ);var wZ=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},iJ=class W extends h5(k(E)){constructor(){super(...arguments);this.value="on",this.indeterminate=!1,this.handleChange=(J)=>{let Z=J.target,K=Z.checked;if(this.requestChecked(K))this.indeterminate=!1;Z.checked=this.checked,this.relayNativeEvent(J)},this.handleLabelChange=()=>{this.syncLabelPresence()}}static{this.shadowRootOptions={...E.shadowRootOptions,delegatesFocus:!0}}sync(){this.internals.setFormValue(this.checked?this.value:null),this.reportRequired(!this.checked,"Tick this box to continue.","control")}formResetCallback(){this.indeterminate=!1,this.resetChecked()}willUpdate(J){super.willUpdate(J),this.internals.ariaRequired=this.required?"true":null}updated(J){super.updated(J),this.sync(),this.syncLabelPresence()}syncLabelPresence(){let Z=(this.renderRoot.querySelector('[part="label"] slot')?.assignedNodes({flatten:!0})??[]).some((K)=>K.textContent?.trim()!==""||K.nodeType===Node.ELEMENT_NODE);this.toggleState("has-label",Z),this.renderRoot.querySelector('[part="label"]')?.toggleAttribute("hidden",!Z)}render(){return F`<label part="field">
      <span part="box">
        <input
          part="control"
          type="checkbox"
          .checked=${this.checked}
          .indeterminate=${this.indeterminate}
          ?disabled=${this.isDisabled}
          ?required=${this.required}
          aria-describedby=${this.describedBy??z}
          @change=${this.handleChange}
          @input=${this.stopInner}
        />
        <span part="mark" aria-hidden="true"></span>
      </span>
      <span part="label"><slot @slotchange=${this.handleLabelChange}>${this.label}</slot></span>
    </label>
    ${this.renderHint()}${this.renderFeedback()}`}};wZ([q()],iJ.prototype,"value",void 0);wZ([q({reflect:!0,type:Boolean})],iJ.prototype,"indeterminate",void 0);iJ=wZ([G("helix-headless-checkbox")],iJ);var y=N(`::placeholder {
color: var(--helix-color-foreground-subtle);
font-weight: var(--helix-weight-medium);
}

[part="label"] {
color: var(--helix-color-foreground);
font-family: var(--helix-font-sans);
font-size: var(--helix-text-sm);
font-weight: var(--helix-weight-medium);
line-height: var(--helix-leading-tight);
}

:host([required]) [part="label"]::after {
color: var(--helix-color-danger);
content: "*";
margin-inline-start: var(--helix-space-2xs);
}

[part="hint"],
[part="feedback"] {
font-family: var(--helix-font-sans);
font-size: var(--helix-text-xs);
line-height: var(--helix-leading-normal);
margin: var(--helix-space-none);
margin-block-start: var(--helix-space-2xs);
}

[part="hint"] {
color: var(--helix-color-foreground-subtle);
}

[part="feedback"] {
color: var(--helix-color-danger);

font-weight: var(--helix-weight-medium);
}

:host(:disabled) [part="label"],
:host(:disabled) [part="hint"] {
opacity: 0.5;
}

[part="label"][data-hidden] {
block-size: 1px;
clip-path: inset(50%);
inline-size: 1px;
overflow: hidden;
position: absolute;
white-space: nowrap;
}

@media print {
:host {
box-shadow: none;
}
}`);var m6=N(`[part="hint"],
[part="feedback"] {

padding-inline-start: calc(var(--_field-control-inline-size, 0px) + var(--helix-space-xs));
}`);var BK=N(`:host {
display: inline-flex;
flex-direction: column;
gap: var(--helix-space-2xs);

--_checkbox-size: var(--checkbox-size, var(--helix-size-checkbox));

--_field-control-inline-size: var(--_checkbox-size);
}

[part="field"] {
align-items: center;
cursor: pointer;
display: inline-flex;
gap: var(--helix-space-xs);
}

:host(:disabled) [part="field"] {
cursor: default;
}

:host(:disabled) {
opacity: 0.5;
}

[part="box"] {
display: grid;
flex: 0 0 auto;

place-items: center;
}

[part="box"] > * {
grid-area: 1 / 1;
}

[part="control"] {
appearance: none;

background-color: var(--checkbox-background-color, var(--helix-color-background));
block-size: var(--_checkbox-size);
border: var(--helix-border-thin) solid var(--checkbox-border-color, var(--helix-color-border));
border-radius: var(--helix-radii-sm);
cursor: inherit;
inline-size: var(--_checkbox-size);
margin: var(--helix-space-none);
transition:
background-color var(--helix-duration-fast) var(--helix-easing-standard),
border-color var(--helix-duration-fast) var(--helix-easing-standard);
}

:host(:not(:disabled)) [part="field"]:hover [part="control"] {
border-color: var(--checkbox-border-color, var(--helix-color-foreground-muted));
}

:host(:state(checked)) [part="control"],
:host([indeterminate]) [part="control"] {
border-color: var(
--checkbox-border-color,
var(--checkbox-checked-color, var(--helix-color-foreground))
);
}

[part="mark"] {

background-color: var(--checkbox-mark-color, var(--helix-color-foreground));
block-size: var(--_checkbox-size);
inline-size: var(--_checkbox-size);

mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23000' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 12.5 10.2 16.7 18 8.4'/%3E%3C/svg%3E");
mask-position: center;
mask-repeat: no-repeat;
mask-size: 100%;
pointer-events: none;

scale: 0;
transition: scale var(--helix-duration-fast) var(--helix-easing-emphasized);
}

:host(:state(checked)) [part="mark"],
:host([indeterminate]) [part="mark"] {
scale: 1;
}

:host([indeterminate]) [part="mark"] {
mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23000' stroke-width='2.5' stroke-linecap='round'%3E%3Cpath d='M7 12h10'/%3E%3C/svg%3E");
}

[part="control"]:focus-visible {
outline: var(--helix-size-focus-ring) solid var(--helix-color-focus-ring);
outline-offset: var(--helix-size-focus-offset);
}

:host(:state(invalid)) [part="control"],
:host(:state(invalid)) [part="field"]:hover [part="control"] {
border-color: var(--helix-color-danger);
}

:host(:state(invalid):state(checked)) [part="control"],
:host(:state(invalid)[indeterminate]) [part="control"] {
border-color: var(--helix-color-danger);
}

:host(:state(invalid)) [part="mark"] {
background-color: var(--helix-color-danger);
}

@media (prefers-reduced-motion: reduce) {
[part="mark"],
[part="control"] {
transition: none;
}
}

:host(:not(:state(has-label))) [part="label"] {
display: none;
}

:host([variant="card"]) {
display: block;
}

:host([variant="card"]) [part="field"] {
align-items: start;
background-color: var(--checkbox-card-background-color, var(--helix-color-surface));
border: var(--helix-border-thin) solid
var(--checkbox-card-border-color, var(--helix-color-border));
border-radius: var(--helix-radii-sm);
display: flex;
gap: var(--helix-space-sm);
inline-size: 100%;
padding: var(--checkbox-card-padding, var(--helix-space-md));
transition:
background-color var(--helix-duration-fast) var(--helix-easing-standard),
border-color var(--helix-duration-fast) var(--helix-easing-standard);
}

:host(:not([disabled])[variant="card"]) [part="field"]:hover {
border-color: var(--helix-color-foreground-muted);
}

:host([variant="card"]:state(checked)) [part="field"] {
background-color: var(--helix-color-surface-raised);
border-color: var(--helix-color-primary);
box-shadow: 0 0 0 var(--helix-border-thick) var(--helix-color-primary);
}

:host([variant="card"]) [part="field"]:has([part="control"]:focus-visible) {
outline: var(--helix-size-focus-ring) solid var(--helix-color-focus-ring);
outline-offset: var(--helix-size-focus-offset);
}

:host([variant="card"]) [part="control"]:focus-visible {
outline: none;
}

:host([variant="card"]) [part="box"] {
margin-block-start: calc(
(var(--helix-text-sm) * var(--helix-leading-tight) - var(--_checkbox-size)) /
2
);
}

@media (prefers-reduced-motion: reduce) {
:host([variant="card"]) [part="field"] {
transition: none;
}
}

@media print {
:host {
box-shadow: none;
print-color-adjust: exact;
}
}`);var AK=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},bZ=class W extends iJ{static{this.styles=[y,m6,BK]}};AK([q({reflect:!0})],bZ.prototype,"variant",void 0);bZ=AK([G("helix-checkbox")],bZ);var DK=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},F9=class W extends k(E){constructor(){super(...arguments);this.value="",this.cascade=new j1(this,{items:()=>this.boxes}),this.handleToggle=(J)=>{let Z=J.target,K=this.boxes.find((X)=>X===Z);if(!K)return;J.stopImmediatePropagation();let Q=J.detail.checked,Y=this.boxes.filter((X)=>X===K?Q:X.checked).map((X)=>X.value).join(",");if(!this.dispatchEvent(new t0({value:Y})))return;this.value=Y,this.dispatchEvent(new Event("input",{bubbles:!0,composed:!0})),this.dispatchEvent(new Event("change",{bubbles:!0,composed:!1}))},this.handleMemberNative=(J)=>{if(J.target!==this)J.stopImmediatePropagation()}}get boxes(){return[...this.children].filter((J)=>J instanceof iJ)}sync(){let J=new Set(this.value.split(",").map((Z)=>Z.trim()).filter(Boolean));for(let Z of this.boxes){if(this.name!==""&&Z.name==="")Z.name=this.name;Z.checked=J.has(Z.value)}}seed(){let J=this.boxes.filter((Z)=>Z.checked).map((Z)=>Z.value);if(J.length>0)this.value=J.join(",")}connectedCallback(){super.connectedCallback(),this.addEventListener("helix-before-toggle",this.handleToggle),this.addEventListener("change",this.handleMemberNative),this.addEventListener("input",this.handleMemberNative)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("helix-before-toggle",this.handleToggle),this.removeEventListener("change",this.handleMemberNative),this.removeEventListener("input",this.handleMemberNative)}willUpdate(J){super.willUpdate(J),L(this.internals,{label:this.label,role:"group"}),this.internals.ariaRequired=this.required?"true":null}firstUpdated(J){if(super.firstUpdated(J),this.value==="")this.seed()}validate(){this.reportRequired(this.value==="","Choose at least one to continue.","items")}updated(J){super.updated(J),this.validate(),this.sync(),this.linkHost()}render(){return F`${this.renderGroupLabel()}
      <div part="items">
        ${""}
        <slot @slotchange=${()=>this.requestUpdate()}></slot>
      </div>
      ${this.renderHint()}${this.renderFeedback()}`}};DK([q()],F9.prototype,"value",void 0);F9=DK([G("helix-headless-checkbox-group")],F9);var l=N(`[part="label"] {
display: block;

padding-block-end: var(--helix-space-2xs);
}`);var PK=N(`:host {
display: flex;
flex-direction: column;
gap: var(--helix-space-2xs);
}

[part="items"] {
display: flex;
flex-direction: column;
gap: var(--checkbox-group-gap, var(--helix-space-xs));
}

:host([orientation="horizontal"]) [part="items"] {
column-gap: var(--checkbox-group-gap, var(--helix-space-md));
flex-direction: row;
flex-wrap: wrap;
}

:host(:state(invalid)) [part="items"] {
--checkbox-border-color: var(--helix-color-danger);
}

@media print {
:host {
box-shadow: none;
print-color-adjust: exact;
}
}`);var IK=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},fZ=class W extends F9{static{this.styles=[y,l,PK]}};IK([q({reflect:!0})],fZ.prototype,"orientation",void 0);fZ=IK([G("helix-checkbox-group")],fZ);var Nz=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},p6=class W extends A{render(){return F`<code part="code"><slot></slot></code>`}};p6=Nz([G("helix-headless-code")],p6);var TK=N(`:host {
display: inline;
}

[part="code"] {

background-color: color-mix(in oklab, var(--helix-color-foreground) 6%, transparent);
border-radius: var(--helix-radii-sm);

color: color-mix(
in oklab,
var(--helix-color-foreground) 30%,
var(--helix-color-foreground-muted)
);
font-family: var(--helix-font-mono);

font-size: var(--code-size, calc(var(--helix-text-sm) / var(--helix-text-md) * 1em));
padding-block: var(--helix-space-none);

padding-inline: var(--code-padding, calc(var(--helix-space-2xs) * 0.5));
}

@media print {
:host {
background-color: transparent;
box-shadow: none;
}
}`);var Oz=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},UK=class W extends p6{static{this.styles=TK}};UK=Oz([G("helix-code")],UK);var Bz=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},d8=class W extends V0{};d8=Bz([G("helix-headless-icon-button")],d8);var n6=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},g6,Az=1600,h7=g6=class W extends d8{constructor(){super(...arguments);this.value="",this.label="Copy",this.copiedLabel="Copied",this.clipboard=new R8(this,{after:Az}),this.handleCopy=async()=>{if(this.isDisabled)return;await this.clipboard.copy(this.value)}}get says(){return this.copied?this.copiedLabel:this.label}get copied(){return this.clipboard.copied}static icon(J){return T`<svg part="mark" fill="currentColor" viewBox=${J.viewBox} aria-hidden="true">
      ${S(J.content)}
    </svg>`}render(){return this.renderTooltip(T`<button
      part="button"
      type="button"
      aria-label=${this.says}
      data-copied=${this.copied?"":z}
      ?disabled=${this.isDisabled}
      @click=${this.handleCopy}
    >
      ${this.renderCopiedIcon()} ${this.renderCopyIcon()}
      </button>`)}renderCopyIcon(){return T`<slot ?hidden=${this.copied}>${g6.icon(D6)}</slot>`}renderCopiedIcon(){return T`<slot name="copied" ?hidden=${!this.copied}
      >${g6.icon(JJ)}</slot
    >`}renderTooltip(J){return T`<${this.tag("tooltip")} content=${this.says} persist
    exportparts="arrow: tooltip-arrow, tooltip">
      ${J}
    </${this.tag("tooltip")}>`}};n6([q()],h7.prototype,"value",void 0);n6([q()],h7.prototype,"label",void 0);n6([q({attribute:"copied-label"})],h7.prototype,"copiedLabel",void 0);h7=g6=n6([G("helix-headless-copy-button")],h7);var jZ=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},i8=class W extends A{constructor(){super(...arguments);this.label="",this.noCopy=!1}get text(){return(this.renderRoot?.querySelector("slot")?.assignedNodes()??[]).map((Z)=>Z.textContent??"").join("")}firstUpdated(){this.requestUpdate()}render(){return T`${this.label?T`<div part="header"><span part="label">${this.label}</span></div>`:z}
      <div part="frame">
        <pre part="block"><code part="code"><slot @slotchange=${()=>this.requestUpdate()}></slot></code></pre>
        ${this.noCopy?z:this.renderCopyButton()}
      </div>`}renderCopyButton(){return T`<${this.tag("copy-button")}
      part="copy"
      exportparts="button: copy-button, mark: copy-mark, tooltip: copy-tooltip,
        tooltip-arrow: copy-tooltip-arrow"
      label="Copy code"
      .value=${this.text}
    ></${this.tag("copy-button")}>`}};jZ([q()],i8.prototype,"label",void 0);jZ([q({attribute:"no-copy",reflect:!0,type:Boolean})],i8.prototype,"noCopy",void 0);i8=jZ([G("helix-headless-code-block")],i8);var CK=N(`:host {
display: flex;
flex-direction: column;
}

[part="frame"] {
flex: 1;
}

[part="header"] {
align-items: center;

backdrop-filter: var(--code-block-backdrop, none);
background-color: var(--code-block-header-background, var(--helix-color-surface-raised));
border: var(--helix-border-thin) solid var(--code-block-border-color, var(--helix-color-border));
border-end-end-radius: var(--helix-radii-none);
border-end-start-radius: var(--helix-radii-none);

border-start-end-radius: var(--code-block-radii, var(--helix-radii-lg));
border-start-start-radius: var(--code-block-radii, var(--helix-radii-lg));
display: flex;

padding-block: var(--helix-space-xs);
padding-inline: var(--helix-space-md);
}

[part="label"] {
color: var(--helix-color-foreground-muted);
font-family: var(--helix-font-sans);
font-size: var(--helix-text-xs);
font-weight: var(--helix-weight-medium);
}

[part="frame"] {
position: relative;
}

[part="block"] {
block-size: 100%;
}

[part="copy"] {
inset-block-start: var(--helix-space-2xs);
inset-inline-end: var(--helix-space-2xs);
position: absolute;
}

[part="block"] {

backdrop-filter: var(--code-block-backdrop, none);
background-color: var(--code-block-background, var(--helix-color-background));
border: var(--helix-border-thin) solid var(--code-block-border-color, var(--helix-color-border));
border-radius: var(--code-block-radii, var(--helix-radii-lg));
margin: var(--helix-space-none);
overflow-x: auto;
padding-block: var(--helix-space-sm);
padding-inline: var(--helix-space-md);
}

:host(:not([no-copy])) [part="block"] {
padding-inline-end: calc(var(--helix-size-control) + var(--helix-space-sm));
}

[part="header"] + [part="frame"] [part="block"] {
border-block-start-width: var(--helix-space-none);
border-start-end-radius: var(--helix-radii-none);
border-start-start-radius: var(--helix-radii-none);
}

[part="code"] {
color: var(--helix-color-foreground);
font-family: var(--helix-font-mono);
font-size: var(--helix-text-sm);
line-height: var(--helix-leading-normal);
}

@media print {
:host {
background-color: transparent;
box-shadow: none;
}
}`);var LK=N(`:host {
display: inline-flex;

--_icon-button-size: var(--icon-button-size, var(--helix-size-control));
}

:host {
--_icon-button-edge: var(--helix-color-border);
--_icon-button-ink: var(--helix-color-foreground-muted);
--_icon-button-ink-hover: var(--helix-color-foreground);

--_icon-button-fill: var(--_icon-button-tone);
--_icon-button-fill-hover: var(--_icon-button-tone-hover);
--_icon-button-on-tone: var(--helix-color-background);
--_icon-button-tone: var(--helix-color-foreground);
--_icon-button-tone-hover: color-mix(
in oklab,
var(--helix-color-foreground) 86%,
var(--helix-color-background)
);
}
:host([tone="primary"]) {
--_icon-button-edge: var(--helix-color-primary);
--_icon-button-ink: var(--helix-color-primary);
--_icon-button-ink-hover: var(--helix-color-primary);
--_icon-button-fill: var(--helix-color-primary-surface);
--_icon-button-fill-hover: var(--helix-color-primary-surface-hover);
--_icon-button-on-tone: var(--helix-color-foreground-on-accent);
--_icon-button-tone: var(--helix-color-primary);
--_icon-button-tone-hover: var(--helix-color-primary-hover);
}

:host([tone="accent"]) {
--_icon-button-edge: var(--helix-color-accent);
--_icon-button-ink: var(--helix-color-accent);
--_icon-button-ink-hover: var(--helix-color-accent);
--_icon-button-fill: var(--helix-color-accent-surface);
--_icon-button-fill-hover: var(--helix-color-accent-surface-hover);
--_icon-button-on-tone: var(--helix-color-foreground-on-accent);
--_icon-button-tone: var(--helix-color-accent);
--_icon-button-tone-hover: var(--helix-color-accent-hover);
}

:host([tone="danger"]) {
--_icon-button-edge: var(--helix-color-danger);
--_icon-button-ink: var(--helix-color-danger);
--_icon-button-ink-hover: var(--helix-color-danger);
--_icon-button-fill: var(--helix-color-danger-surface);
--_icon-button-fill-hover: var(--helix-color-danger-surface-hover);
--_icon-button-on-tone: var(--helix-color-foreground-on-accent);
--_icon-button-tone: var(--helix-color-danger);
--_icon-button-tone-hover: color-mix(
in oklab,
var(--helix-color-danger) 86%,
var(--helix-color-foreground)
);
}

[part="button"] {
align-items: center;
background-color: transparent;
block-size: var(--_icon-button-size);
border: var(--helix-border-thin) solid transparent;

border-end-end-radius: var(--button-radii-end, var(--icon-button-radii, var(--helix-radii-sm)));
border-end-start-radius: var(
--button-radii-start,
var(--icon-button-radii, var(--helix-radii-sm))
);
border-start-end-radius: var(--button-radii-end, var(--icon-button-radii, var(--helix-radii-sm)));
border-start-start-radius: var(
--button-radii-start,
var(--icon-button-radii, var(--helix-radii-sm))
);
color: var(--_icon-button-ink);
cursor: pointer;
display: inline-flex;

font: inherit;
inline-size: var(--_icon-button-size);
justify-content: center;
padding: var(--helix-space-none);
transition:
background-color var(--helix-duration-fast) var(--helix-easing-standard),
color var(--helix-duration-fast) var(--helix-easing-standard);
}

:host(:not(:disabled)) [part="button"]:hover {
background-color: color-mix(in oklab, var(--_icon-button-tone) 8%, transparent);
color: var(--_icon-button-ink-hover);
}

:host([shape="circle"]) [part="button"] {
border-radius: var(--helix-radii-full);
}

:host([raised]) [part="button"] {
box-shadow: var(--icon-button-shadow, var(--helix-shadow-md));
}

:host([raised]:not(:disabled)) [part="button"]:hover {
box-shadow: var(--icon-button-shadow, var(--helix-shadow-lg));
}

:host([raised]:not(:disabled)) [part="button"]:active {
box-shadow: var(--icon-button-shadow, var(--helix-shadow-sm));
}

[part="button"]:focus-visible {
outline: var(--helix-size-focus-ring) solid var(--helix-color-focus-ring);
outline-offset: var(--helix-size-focus-offset);
}

:host([emphasis="solid"]) [part="button"] {
background-color: var(--_icon-button-fill);
border-color: transparent;
color: var(--_icon-button-on-tone);
}
:host(:not(:disabled)[emphasis="solid"]) [part="button"]:hover {
background-color: var(--_icon-button-fill-hover);
color: var(--_icon-button-on-tone);
}

:host([emphasis="outlined"]) [part="button"] {
background-color: color-mix(in oklab, var(--_icon-button-tone) 6%, transparent);
border-color: var(--_icon-button-edge);
color: var(--_icon-button-tone);
}
:host(:not(:disabled)[emphasis="outlined"]) [part="button"]:hover {
background-color: color-mix(in oklab, var(--_icon-button-tone) 12%, transparent);
color: var(--_icon-button-tone);
}

:host([emphasis="subtle"]) [part="button"] {
background-color: color-mix(in oklab, var(--_icon-button-tone) 14%, transparent);
border-color: transparent;
color: var(--_icon-button-tone);
}

:host(:not(:disabled)[emphasis="subtle"]) [part="button"]:hover {
background-color: color-mix(in oklab, var(--_icon-button-tone) 22%, transparent);
color: var(--_icon-button-tone);
}

:host(:disabled) [part="button"] {
cursor: not-allowed;
opacity: 0.5;
}

@media (prefers-reduced-motion: reduce) {
[part="button"] {
transition: none;
}
}

@media print {
:host {
display: none;
}
}`);var _Z=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},s8=class W extends n8(d8){constructor(){super(...arguments);this.raised=!1}static{this.styles=LK}};_Z([q({reflect:!0})],s8.prototype,"shape",void 0);_Z([q({reflect:!0,type:Boolean})],s8.prototype,"raised",void 0);s8=_Z([G("helix-icon-button")],s8);var MK=N(`[part="button"] {
display: inline-grid;
place-items: center;
}

[part="button"] > slot {
grid-area: 1 / 1;
}

slot[hidden] {
display: none;
}

[part="button"] > slot[hidden] {
display: none;
}

[part="button"][data-copied] {
color: var(--helix-color-success);
}

:host(:not(:disabled)) [part="button"][data-copied]:hover {
color: var(--helix-color-success);
}

slot > svg {
block-size: var(--helix-size-icon-sm);
inline-size: var(--helix-size-icon-sm);
}

@media print {
:host {
display: none;
}
}`);var Dz=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},SK=class W extends n8(h7){static{this.tier="helix-"}static{this.styles=[s8.styles,MK].flat()}};SK=Dz([G("helix-copy-button")],SK);var Pz=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},RK=class W extends i8{static{this.tier="helix-"}static{this.styles=CK}};RK=Pz([G("helix-code-block")],RK);var a8=(W,J,Z)=>Math.min(Z,Math.max(J,W)),Iz=(W)=>{if(W===void 0)return 100;let J=Number.parseFloat(W);if(Number.isNaN(J))return 100;return a8(W.includes("%")?J:J*100,0,100)},vZ=(W)=>{let J=Number.parseFloat(W);return a8(W.includes("%")?J/100*255:J,0,255)},EK=(W,J,Z,K)=>{let Q=W/255,Y=J/255,X=Z/255,$=Math.max(Q,Y,X),V=Math.min(Q,Y,X),O=$-V,B=0;if(O!==0){if($===Q)B=(Y-X)/O+(Y<X?6:0);else if($===Y)B=(X-Q)/O+2;else B=(Q-Y)/O+4;B*=60}return{alpha:K,brightness:Math.round($*100),hue:Math.round(B),saturation:Math.round($===0?0:O/$*100)}},wK=(W)=>{let J=(W.hue%360+360)%360/60,Z=W.saturation/100,K=W.brightness/100,Q=K*Z,Y=Q*(1-Math.abs(J%2-1)),X=K-Q,$=[[Q,Y,0],[Y,Q,0],[0,Q,Y],[0,Y,Q],[Y,0,Q],[Q,0,Y]],[V,O,B]=$[Math.floor(J)%6]??[0,0,0];return{blue:Math.round((B+X)*255),green:Math.round((O+X)*255),red:Math.round((V+X)*255)}},Tz=(W)=>{let J=W.saturation/100,Z=W.brightness/100,K=Z*(2-J)/2;return{hue:(W.hue%360+360)%360,lightness:Math.round(K*100),saturation:Math.round((K===0||K===1?0:(Z-K)/Math.min(K,1-K))*100)}},bK=(W)=>{let J=[],Z=0,K="";for(let Q of W){if(Q==="(")Z+=1;else if(Q===")")Z=Math.max(0,Z-1);if(Q===","&&Z===0)J.push(K.trim()),K="";else K+=Q}return J.push(K.trim()),J.filter(Boolean)},k0=(W)=>{let J=W.trim().toLowerCase();if(J==="")return null;if(J.startsWith("#")){let P=J.slice(1),I=P.length===3||P.length===4,C=P.length===6||P.length===8;if(!I&&!C||!/^[\da-f]+$/.test(P))return null;let M=I?1:2,w=(b)=>{let f=P.slice(b*M,b*M+M);return Number.parseInt(I?f+f:f,16)},R=P.length===4||P.length===8;return EK(w(0),w(1),w(2),R?Math.round(w(3)/255*100):100)}let Z=/^(rgba?|hsla?)\(([^)]*)\)$/.exec(J);if(!Z?.[1]||Z[2]===void 0)return null;let[K="",Q="",Y="",X]=Z[2].replace(/[,/]/g," ").split(/\s+/).filter(Boolean);if(K===""||Q===""||Y==="")return null;let $=Iz(X);if(Z[1].startsWith("rgb"))return EK(vZ(K),vZ(Q),vZ(Y),$);let V=Number.parseFloat(K),O=a8(Number.parseFloat(Q),0,100)/100,B=a8(Number.parseFloat(Y),0,100)/100;if(Number.isNaN(V)||Number.isNaN(O)||Number.isNaN(B))return null;let D=B+O*Math.min(B,1-B);return{alpha:$,brightness:Math.round(D*100),hue:Math.round((V%360+360)%360),saturation:Math.round((D===0?0:2*(1-B/D))*100)}},fK=(W,J,Z)=>{let K=a8(W.alpha,0,100)/100,Q=Number(K.toFixed(2));if(J==="hsl"){let{hue:B,lightness:D,saturation:P}=Tz(W),I=`${Math.round(B)}, ${P}%, ${D}%`;return Z?`hsla(${I}, ${Q})`:`hsl(${I})`}let{blue:Y,green:X,red:$}=wK(W);if(J==="rgb"){let B=`${$}, ${X}, ${Y}`;return Z?`rgba(${B}, ${Q})`:`rgb(${B})`}let V=(B)=>B.toString(16).padStart(2,"0"),O=`#${V($)}${V(X)}${V(Y)}`;return Z?O+V(Math.round(K*255)):O},N9=(W)=>{let{blue:J,green:Z,red:K}=wK(W);return`rgb(${K} ${Z} ${J} / ${a8(W.alpha,0,100)}%)`};var WJ=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},Y1=class W extends u(k(E)){constructor(){super(...arguments);this.announcesInput=!0,this.range=!1,this.max=100,this.min=0,this.showValue=!1,this.markers=0,this.markerLabels=!1,this.step=1,this.handleInput=(J)=>{J.stopPropagation();let Z=J.target;if(this.range){let[Q,Y]=this.bounds,X=Number(Z.value),$=Z.dataset.thumb==="start"?[Math.min(X,Y),Y]:[Q,Math.max(X,Q)];this.requestValue($.join(",")),Q0(Z,String(Z.dataset.thumb==="start"?this.bounds[0]:this.bounds[1]));return}let K=Z.value;this.requestValue(K),Q0(Z,this.value)},this.handleChange=(J)=>{J.stopPropagation(),this.dispatchEvent(new Event("change",{bubbles:!0,composed:!1}))}}get reserve(){let J=Math.max(String(this.min).length,String(this.max).length);return this.range?J*2+4:J}get precision(){return String(this.step).split(".")[1]?.length??0}get markerValues(){let J=this.max-this.min;if(this.markers<2||J<=0)return[];let Z=this.step>0?this.step:1,K=Array.from({length:this.markers},(Q,Y)=>{let X=this.min+Y/(this.markers-1)*J,$=Math.min(this.max,Math.max(this.min,this.min+Math.round((X-this.min)/Z)*Z));return Number($.toFixed(this.precision))});return[...new Set(K)]}get valueAsNumber(){let J=Number.parseFloat(this.value);return Number.isNaN(J)?this.min:J}static{this.shadowRootOptions={...E.shadowRootOptions,delegatesFocus:!0}}get bounds(){let J=this.value.split(","),Z=Number.parseFloat(J[0]??""),K=Number.parseFloat(J[1]??"");if(!Number.isFinite(Z)||!Number.isFinite(K))return[this.min,this.max];return[Math.min(Z,K),Math.max(Z,K)]}along(J){let Z=this.max-this.min;if(Z===0)return 0;return Math.min(1,Math.max(0,(J-this.min)/Z))}sync(){this.internals.setFormValue(this.value),this.refreshFeedback()}get fraction(){if(this.max-this.min===0)return 0;return this.along(this.snapped(this.valueAsNumber))}snapped(J){if(!(this.step>0))return J;let Z=Math.round((J-this.min)/this.step);return Number((this.min+Z*this.step).toFixed(this.precision))}willUpdate(J){if(super.willUpdate(J),!this.hasUpdated&&this.value==="")this.defaultValue=String(this.min+(this.max-this.min)/2)}updated(J){super.updated(J),this.sync()}render(){let[J,Z]=this.bounds,K=(Q,Y)=>F`<input
        part="control"
        data-thumb=${Q}
        type="range"
        style="--slider-from: ${this.along(J)}; --slider-to: ${this.along(Z)}"
        min=${this.min}
        max=${this.max}
        step=${this.step}
        .value=${String(Y)}
        aria-label=${`${this.label} ${Q==="start"?"minimum":"maximum"}`}
        aria-describedby=${this.describedBy??z}
        ?disabled=${this.isDisabled}
        @input=${this.handleInput}
        @change=${this.handleChange}
      />`;return F`${this.renderLabel()}
    <div
      part="field"
      data-markers=${this.markerValues.length>0?"":z}
      data-range=${this.range?"":z}
      style="--slider-fraction: ${this.fraction}; --slider-from: ${this.along(J)}; --slider-to: ${this.along(Z)}"
    >
      ${this.range?K("start",J):z}
      ${this.range?K("end",Z):z}
      ${this.range?z:F`<input
              part="control"
              id="control"
              type="range"
              style="--slider-fraction: ${this.fraction}"
              min=${this.min}
              max=${this.max}
              step=${this.step}
              .value=${this.value}
              name=${this.name||z}
              aria-describedby=${this.describedBy??z}
              ?disabled=${this.isDisabled}
              @input=${this.handleInput}
              @change=${this.handleChange}
            />`}
      ${this.markers>1?F`<div part="markers" aria-hidden="true">
              ${this.markerValues.map((Q)=>F`<span
                    part="marker"
                    style="--slider-marker-at: ${(Q-this.min)/(this.max-this.min)*100}%"
                    >${this.markerLabels?F`<span part="marker-label">${Q}</span>`:z}</span
                  >`)}
            </div>`:z}
      ${this.showValue?F`<output
              part="output"
              for="control"
              aria-hidden="true"
              style=${`--_slider-output-reserve: ${this.reserve}ch`}
              >${this.range?`${J} to ${Z}`:this.value}</output
            >`:z}
    </div>
    ${this.renderHint()}${this.renderFeedback()}`}};WJ([q({reflect:!0,type:Boolean})],Y1.prototype,"range",void 0);WJ([q({type:Number})],Y1.prototype,"max",void 0);WJ([q({type:Number})],Y1.prototype,"min",void 0);WJ([q({attribute:"show-value",reflect:!0,type:Boolean})],Y1.prototype,"showValue",void 0);WJ([q({type:Number})],Y1.prototype,"markers",void 0);WJ([q({attribute:"marker-labels",reflect:!0,type:Boolean})],Y1.prototype,"markerLabels",void 0);WJ([q({type:Number})],Y1.prototype,"step",void 0);WJ([q({reflect:!0})],Y1.prototype,"orientation",void 0);Y1=WJ([G("helix-headless-slider")],Y1);var I1=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},kZ=["hex","rgb","hsl"],Uz={alpha:100,brightness:100,hue:0,saturation:100},H0=class W extends u(E){constructor(){super(...arguments);this.autocomplete="off",this.invalid=!1,this.alpha=!1,this.noValue=!1,this.noFormat=!1,this.noEyedropper=!1,this.swatches="",this.sampling=!1,this.owned=!1,this.settled="",this.handleValueInput=(J)=>{J.stopPropagation();let Z=J.target.value,K=k0(Z);if(K)this.moved=K,this.owned=!0;this.requestValue(Z)},this.move=(J)=>{this.moved={...this.color,...J},this.owned=!0,this.requestValue(fK(this.moved,this.format??"hex",this.alpha))},this.copier=new R8(this),this.handleSwatch=(J)=>{let Z=k0(J);if(Z)this.move(Z)},this.handleFormat=()=>{if(this.format=kZ[(kZ.indexOf(this.format??"hex")+1)%kZ.length]??"hex",this.value!=="")this.move({})},this.handleEyeDropper=async()=>{let J=globalThis.EyeDropper;if(!J)return;this.dispatchEvent(new z8);try{let{sRGBHex:Z}=await new J().open(),K=k0(Z);if(K)this.move({...K,alpha:this.color.alpha})}catch{}this.dispatchEvent(new V8)},this.handleGridPointer=(J)=>{let Z=J.currentTarget;if(J.type==="pointerdown")u8(Z,J.pointerId),this.renderRoot?.querySelector('[part="grid-saturation"]')?.focus();else if(!Z.hasPointerCapture(J.pointerId))return;J.preventDefault();let K=Z.getBoundingClientRect();if(K.width===0||K.height===0)return;let Q=Math.min(1,Math.max(0,(J.clientX-K.left)/K.width)),Y=Math.min(1,Math.max(0,(J.clientY-K.top)/K.height));this.move({brightness:Math.round((1-Y)*100),saturation:Math.round(Q*100)})}}get color(){return this.moved??k0(this.value)??k0(this.settled)??Uz}get tools(){return this.sampling&&!this.noEyedropper||!this.noFormat}get presets(){return bK(this.swatches).filter((J)=>k0(J)!==null)}firstUpdated(J){super.firstUpdated(J),this.sampling="EyeDropper"in globalThis}updated(J){if(super.updated(J),J.has("value")){if(k0(this.value))this.settled=this.value;if(this.owned)this.owned=!1;else this.moved=void 0}}focus(J){this.renderRoot?.querySelector('[part="grid-saturation"]')?.focus(J)}renderChannel(J,Z,K,Q){return T`<${this.tag("slider")}
      part="channel"
      exportparts="control: channel-control, feedback: channel-feedback, field: channel-field,
        hint: channel-hint, label: channel-label, marker: channel-marker,
        marker-label: channel-marker-label, markers: channel-markers, output: channel-output"
      data-channel=${J}
      label=${Z}
      max=${K}
      min="0"
      .value=${String(Q)}
      ?disabled=${this.isDisabled}
      @input=${(Y)=>this.takeChannel(J,Y)}
      @change=${(Y)=>this.takeChannel(J,Y)}
    ></${this.tag("slider")}>`}takeArea(J,Z){Z.stopPropagation();let{value:K}=Z.target;this.move({[J]:Number(K)})}takeChannel(J,Z){Z.stopPropagation();let{value:K}=Z.target;this.move({[J]:Number(K)})}willUpdate(J){super.willUpdate(J),this.internals.ariaInvalid=this.invalid?"true":null}renderTools(){return T`<${this.tag("button-group")} part="actions" label="Color tools">
                ${this.sampling&&!this.noEyedropper?T`<${this.tag("button")}
                        part="eyedropper"
      exportparts="button: eyedropper-button"
                        aria-label="Sample a color from the screen"
                        ?disabled=${this.isDisabled}
                        @click=${this.handleEyeDropper}
                      >
                        <slot name="eyedropper-icon">${x(L6)}</slot>
                      </${this.tag("button")}>`:z}
                ${this.noFormat?z:T`<${this.tag("button")}
                        part="format"
      exportparts="button: format-button"
                        aria-label=${`Syntax: ${this.format??"hex"}. Change it.`}
                        ?disabled=${this.isDisabled}
                        @click=${this.handleFormat}
                      >
                        ${this.format??"hex"}
                      </${this.tag("button")}>`}
              </${this.tag("button-group")}>`}render(){let J=this.color,Z=N9(J);return T`<div
        part="grid"
        style="--color-picker-hue: ${J.hue}; --color-picker-saturation: ${J.saturation}%; --color-picker-brightness: ${J.brightness}%"
        @pointerdown=${this.handleGridPointer}
        @pointermove=${this.handleGridPointer}
      >
        <span part="grid-handle" aria-hidden="true"></span>
        <input
          part="grid-saturation"
          type="range"
          min="0"
          max="100"
          aria-label="Saturation"
          .value=${String(J.saturation)}
          ?disabled=${this.isDisabled}
          @input=${(K)=>this.takeArea("saturation",K)}
        />
        <input
          part="grid-brightness"
          type="range"
          min="0"
          max="100"
          aria-label="Brightness"
          .value=${String(J.brightness)}
          ?disabled=${this.isDisabled}
          @input=${(K)=>this.takeArea("brightness",K)}
        />
      </div>

      <div part="controls" style="--color-picker-hue: ${J.hue}; --color-picker-swatch: ${Z}">
        <button
          part="sample"
          type="button"
          aria-label=${this.copier.copied?"Copied":`Copy ${this.value||"the color"}`}
          data-copied=${this.copier.copied?"":z}
          ?disabled=${this.isDisabled||this.value===""}
          @click=${()=>this.copier.copy(this.value)}
        ></button>
        <div part="channels">
          ${this.renderChannel("hue","Hue",360,J.hue)}
          ${this.alpha?this.renderChannel("alpha","Opacity",100,J.alpha):z}
        </div>
      </div>

      <!-- The syntax and the presets share a row, because neither fills one.
           Above them the ramps get the whole width, which is what they need:
           with the two controls stacked in a column beside them the hue bar was
           eighty pixels, and a hue is picked out of three hundred and sixty. -->
      <div part="footer">
        ${this.noValue?z:T`<input
                part="value"
                type="text"
                aria-label="Color"
                autocomplete=${this.autocomplete||z}
                spellcheck="false"
                .value=${this.value}
                ?disabled=${this.isDisabled}
                @input=${this.handleValueInput}
              />`}
        ${this.tools?T`${this.renderTools()}`:z}
      </div>

      ${this.presets.length===0?z:T`<div part="swatches" role="group" aria-label="Presets">
                ${this.presets.map((K)=>{let Q=k0(K);return T`<button
                    part="swatch"
                    type="button"
                    aria-label=${K}
                    aria-pressed=${Q!==null&&N9(Q)===Z?"true":"false"}
                    style="--color-picker-swatch: ${K}"
                    ?disabled=${this.isDisabled}
                    @click=${()=>this.handleSwatch(K)}
                  ></button>`})}
              </div>`}
      </div>`}};I1([q()],H0.prototype,"autocomplete",void 0);I1([q({reflect:!0,type:Boolean})],H0.prototype,"invalid",void 0);I1([q({reflect:!0,type:Boolean})],H0.prototype,"alpha",void 0);I1([q({reflect:!0})],H0.prototype,"format",void 0);I1([q({attribute:"no-value",type:Boolean})],H0.prototype,"noValue",void 0);I1([q({attribute:"no-format",type:Boolean})],H0.prototype,"noFormat",void 0);I1([q({attribute:"no-eyedropper",type:Boolean})],H0.prototype,"noEyedropper",void 0);I1([q()],H0.prototype,"swatches",void 0);I1([U()],H0.prototype,"moved",void 0);I1([U()],H0.prototype,"sampling",void 0);H0=I1([G("helix-headless-color-picker")],H0);var KJ=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},W1=class W extends g(u(k(E))){constructor(){super(...arguments);this.autocomplete="off",this.alpha=!1,this.noFormat=!1,this.placeholder="#000000",this.swatches="",this.triggerLabel="Choose a color",this.panel=new d(this,{anchor:()=>this.renderRoot?.querySelector('[part="field"]'),boundary:()=>[this.renderRoot?.querySelector('[part="surface"]'),this.renderRoot?.querySelector('[part="trigger"]')],offset:()=>8,onDismiss:()=>this.requestOpen(!1),placement:"bottom-start",surface:()=>this.renderRoot?.querySelector('[part="surface"]')}),this.settled="",this.handleInput=(J)=>{J.stopPropagation(),this.requestValue(J.target.value),this.restore()},this.handlePickerChange=(J)=>{J.stopPropagation(),this.requestValue(J.detail.value),this.restore()},this.handleSampleStart=()=>{this.requestOpen(!1)},this.handleSampleEnd=()=>{this.requestOpen(!0)},this.handleKeydown=(J)=>{if(J.key==="Escape"&&this.open)J.stopPropagation(),this.requestOpen(!1),this.control?.focus()}}get anchor(){if(typeof this.renderRoot?.querySelector!=="function")return null;return this.control??this.renderRoot.querySelector('[part="trigger"]')}get control(){if(typeof this.renderRoot?.querySelector!=="function")return null;return this.renderRoot.querySelector('[part="control"]')}get picked(){return k0(this.value)?this.value:this.settled}get painted(){let J=k0(this.value);return J?N9(J):"transparent"}restore(){let J=this.control;if(J&&J.value!==this.value)J.value=this.value;this.sync()}sync(){this.internals.setFormValue(this.value);let J=this.anchor;if(!J)return;let Z=this.control;if(this.value!==""&&k0(this.value)===null)this.internals.setValidity({badInput:!0},"Enter a color, like #ff0000, rgb(255 0 0) or hsl(0 100% 50%).",J);else if(Z)this.internals.setValidity(Z.validity,Z.validationMessage,Z);else this.internals.setValidity(this.required&&this.value===""?{valueMissing:!0}:{},this.required&&this.value===""?"Choose a color.":"",J);this.refreshFeedback()}firstUpdated(J){super.firstUpdated(J),this.sync()}updated(J){if(super.updated(J),J.has("value")){if(this.sync(),k0(this.value))this.settled=this.value}if(this.open)this.panel.show();else this.panel.hide()}focus(J){this.anchor?.focus(J)}renderPicker(){return T`<${this.tag("color-picker")}
      part="picker"
      exportparts="actions: picker-actions, channel: picker-channel, channel-control: picker-channel-control,
        channel-feedback: picker-channel-feedback, channel-field: picker-channel-field,
        channel-hint: picker-channel-hint, channel-label: picker-channel-label,
        channel-marker: picker-channel-marker, channel-marker-label: picker-channel-marker-label,
        channel-markers: picker-channel-markers, channel-output: picker-channel-output,
        channels: picker-channels, controls: picker-controls, eyedropper: picker-eyedropper,
        eyedropper-button: picker-eyedropper-button, footer: picker-footer, format: picker-format,
        format-button: picker-format-button, grid: picker-grid,
        grid-brightness: picker-grid-brightness, grid-handle: picker-grid-handle,
        grid-saturation: picker-grid-saturation, icon: picker-icon, sample: picker-sample,
        swatch: picker-swatch, swatches: picker-swatches, value: picker-value"
      ?invalid=${this.resolvedFeedback!==""}
      ?alpha=${this.alpha}
      ?no-format=${this.noFormat}
      ?no-value=${this.variant!=="swatch"}
      .format=${this.format??"hex"}
      .value=${this.picked}
      swatches=${this.swatches||z}
      ?disabled=${this.isDisabled}
      @helix-before-change=${this.handlePickerChange}
      @change=${this.stopInner}
      @input=${this.stopInner}
      @helix-sample-start=${this.handleSampleStart}
      @helix-sample-end=${this.handleSampleEnd}
    ></${this.tag("color-picker")}>`}render(){return T`${this.renderLabel()}
      <div part="field" @keydown=${this.handleKeydown}>
        <!-- The same pair Input carries, in the same places: leading content
             before the text, trailing content after it and before the trigger.
             A label wanting to sit inside the field rather than over it goes
             here, which is what the toggle group's own label-placement does and
             what this had no way to express. Backticks stay out of this
             comment: it is inside a tagged template, so one would end the
             literal and the error lands on a line further down. -->
        <slot name="start"></slot>
        ${this.variant==="swatch"?z:T`<input
          part="control"
          id="control"
          type="text"
          .value=${this.value}
          name=${this.name||z}
          placeholder=${this.placeholder||z}
          autocomplete=${this.autocomplete||z}
          spellcheck="false"
          aria-describedby=${this.describedBy??z}
          ?disabled=${this.isDisabled}
          ?required=${this.required}
          @input=${this.handleInput}
        />`}
        <slot name="end"></slot>
        <button
          part="trigger"
          id=${this.variant==="swatch"?"control":z}
          type="button"
          aria-controls="surface"
          aria-expanded=${this.open?"true":"false"}
          aria-haspopup="dialog"
          aria-label=${this.triggerLabel}
          ?disabled=${this.isDisabled}
          @click=${()=>this.toggleOpen()}
        >
          <span
            part="preview"
            style="--color-input-swatch: ${this.value===""?"transparent":this.painted}"
          ></span>
          <slot name="trigger"></slot>
        </button>
      </div>

      <div part="surface" id="surface" popover="manual" ?hidden=${!this.open}>
        ${this.renderPicker()}
      </div>
      ${this.renderHint()}${this.renderFeedback()}`}};KJ([q()],W1.prototype,"autocomplete",void 0);KJ([q({reflect:!0})],W1.prototype,"variant",void 0);KJ([q({reflect:!0,type:Boolean})],W1.prototype,"alpha",void 0);KJ([q({reflect:!0})],W1.prototype,"format",void 0);KJ([q({attribute:"no-format",type:Boolean})],W1.prototype,"noFormat",void 0);KJ([q()],W1.prototype,"placeholder",void 0);KJ([q()],W1.prototype,"swatches",void 0);KJ([q({attribute:"trigger-label"})],W1.prototype,"triggerLabel",void 0);W1=KJ([G("helix-headless-color-input")],W1);var HZ=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},o8=class W extends A{constructor(){super(...arguments);this.name="",this.label=""}render(){let J=Object.hasOwn(NZ,this.name)?NZ[this.name]:void 0;if(!J)return z;let Z=this.label.length>0;return F`<svg
      part="svg"
      fill="currentColor"
      viewBox=${J.viewBox}
      role=${Z?"img":z}
      aria-label=${Z?this.label:z}
      aria-hidden=${Z?z:"true"}
    >
      ${S(J.content)}
    </svg>`}};HZ([q()],o8.prototype,"name",void 0);HZ([q()],o8.prototype,"label",void 0);o8=HZ([G("helix-headless-icon")],o8);var jK=N(`:host {
block-size: var(--icon-size, var(--helix-size-icon));

display: inline-flex;
flex: 0 0 auto;
inline-size: var(--icon-size, var(--helix-size-icon));
}

[part="svg"] {
block-size: 100%;
inline-size: 100%;
}

@media print {
:host {
box-shadow: none;
}
}`);var Cz=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},_K=class W extends o8{static{this.styles=jK}};_K=Cz([G("helix-icon")],_K);var vK=N(`:host {
display: flex;
flex-direction: column;
gap: var(--helix-space-2xs);

--_slider-track: var(--slider-track-size, var(--helix-size-progress));

--_slider-thumb: var(--slider-thumb-size, var(--helix-size-checkbox));
--_slider-thumb-length: var(--slider-thumb-length, var(--_slider-thumb));
--_slider-thumb-radii: var(--slider-thumb-radii, var(--helix-radii-full));

--_slider-halo: color-mix(
in oklab,
var(--slider-fill-color, var(--helix-color-primary)) 24%,
transparent
);

--_slider-track-color: var(--slider-track-color, var(--helix-color-border));
}

[part="field"] {
align-items: center;
display: flex;
gap: var(--helix-space-sm);
}

[part="field"][data-markers] {
display: grid;
grid-template-columns: 1fr auto;
}

[part="control"] {

z-index: var(--helix-layer-raised);

appearance: none;
background: transparent;
cursor: pointer;
flex: 1 1 auto;
min-inline-size: 0;
}

[part="field"][data-markers] [part="control"],
[part="field"][data-markers] [part="markers"] {
grid-column: 1;
grid-row: 1;
}

[part="output"] {
color: var(--helix-color-foreground);
font-family: var(--helix-font-sans);
font-size: var(--helix-text-sm);
font-variant-numeric: tabular-nums;

min-inline-size: var(--_slider-output-reserve, 3ch);
text-align: end;
}

[part="field"][data-markers] [part="output"] {
grid-column: 2;
grid-row: 1;
}

[part="control"] {
--_slider-track-image: var(
--slider-track-image,
linear-gradient(
to right,
var(--slider-fill-color, var(--helix-color-primary)) calc(var(--slider-fraction, 0) * 100%),
var(--_slider-track-color) calc(var(--slider-fraction, 0) * 100%)
)
);
}

[part="markers"] {
align-self: center;
block-size: var(--_slider-track);
margin-inline: calc(var(--_slider-thumb-length) / 2);
pointer-events: none;
position: relative;
z-index: var(--helix-layer-raised);
}

:host([marker-labels]) [part="field"] {
padding-block-end: var(--helix-space-lg);
}

[part="marker-label"] {
color: var(--helix-color-foreground-subtle);
font-family: var(--helix-font-sans);
font-size: var(--helix-text-xs);
font-variant-numeric: tabular-nums;
inset-block-start: var(--helix-space-sm);
inset-inline-start: 50%;
position: absolute;
translate: -50% 0;
}

[part="markers"] {
--_slider-hole: calc(var(--_slider-thumb-length) / 2 + var(--helix-border-thin));

mask-image: radial-gradient(
circle at calc(var(--slider-fraction, 0) * 100%) 50%,
transparent var(--_slider-hole),
currentColor var(--_slider-hole)
);
pointer-events: none;
z-index: var(--helix-layer-raised);
}

[part="field"][data-range] [part="markers"] {
mask-composite: intersect;
mask-image:
radial-gradient(
circle at calc(var(--slider-from, 0) * 100%) 50%,
transparent var(--_slider-hole),
currentColor var(--_slider-hole)
),
radial-gradient(
circle at calc(var(--slider-to, 0) * 100%) 50%,
transparent var(--_slider-hole),
currentColor var(--_slider-hole)
);
}

:host([orientation="vertical"]) [part="markers"] {
mask-image: radial-gradient(
circle at 50% calc(100% - var(--slider-fraction, 0) * 100%),
transparent var(--_slider-hole),
currentColor var(--_slider-hole)
);
}

[part="marker"] {
background-color: var(--slider-marker-color, var(--helix-color-background));
block-size: var(--_slider-track);
border-radius: var(--helix-radii-full);
inline-size: var(--helix-border-thick);
inset-block-start: 0;

inset-inline-start: var(--slider-marker-at, 0%);
position: absolute;
translate: -50% 0;
}

:host(:disabled) [part="control"] {
cursor: not-allowed;
}

:host(:disabled) {
opacity: 0.5;
}

[part="control"]::-webkit-slider-runnable-track {
background: var(--_slider-track-image);
block-size: var(--_slider-track);
border-radius: var(--helix-radii-full);
}

[part="control"]::-moz-range-track {
background: var(--_slider-track-image);
block-size: var(--_slider-track);
border-radius: var(--helix-radii-full);
}

[part="control"]::-webkit-slider-thumb {
appearance: none;

background-color: var(--slider-thumb-color, var(--helix-color-surface-inverse));
block-size: var(--_slider-thumb);
border: none;
border-radius: var(--_slider-thumb-radii);

box-shadow:
0 0 0 var(--helix-border-thick) var(--slider-thumb-ring-color, var(--helix-color-background)),
var(--helix-shadow-md);
inline-size: var(--_slider-thumb-length);
margin-block-start: calc((var(--_slider-track) - var(--_slider-thumb)) / 2);
}

[part="control"]:focus-visible::-webkit-slider-thumb,
[part="control"]:active::-webkit-slider-thumb {
box-shadow:
0 0 0 var(--helix-border-thick) var(--slider-thumb-ring-color, var(--helix-color-background)),
var(--helix-shadow-md),
0 0 0 var(--helix-space-2xs) var(--_slider-halo);
}

[part="control"]:focus-visible::-moz-range-thumb,
[part="control"]:active::-moz-range-thumb {
box-shadow:
0 0 0 var(--helix-border-thick) var(--slider-thumb-ring-color, var(--helix-color-background)),
var(--helix-shadow-md),
0 0 0 var(--helix-space-2xs) var(--_slider-halo);
}

[part="control"]::-moz-range-thumb {
background-color: var(--slider-thumb-color, var(--helix-color-surface-inverse));
block-size: var(--_slider-thumb);

border: none;
border-radius: var(--_slider-thumb-radii);

box-shadow:
0 0 0 var(--helix-border-thick) var(--slider-thumb-ring-color, var(--helix-color-background)),
var(--helix-shadow-md);
inline-size: var(--_slider-thumb-length);
}

[part="control"]:focus-visible {
outline: none;
}

[part="control"]:focus-visible::-webkit-slider-thumb {
outline: var(--helix-size-focus-ring) solid var(--helix-color-focus-ring);
outline-offset: var(--helix-size-focus-offset);
}

[part="control"]:focus-visible::-moz-range-thumb {
outline: var(--helix-size-focus-ring) solid var(--helix-color-focus-ring);
outline-offset: var(--helix-size-focus-offset);
}

:host(:state(invalid)) [part="control"]::-webkit-slider-thumb {
box-shadow: 0 0 0 var(--helix-size-focus-ring) var(--helix-color-danger);
}

:host(:state(invalid)) [part="control"]::-moz-range-thumb {
box-shadow: 0 0 0 var(--helix-size-focus-ring) var(--helix-color-danger);
}

:host([range]) [part="field"] {
display: grid;
grid-template-columns: 1fr auto;
}

:host([range]) [part="control"] {
grid-area: 1 / 1;
}

:host([range]) [part="output"] {
grid-column: 2;
grid-row: 1;
}

:host([range]) [part="control"][data-thumb="start"] {
--_slider-track-image: var(
--slider-track-image,
linear-gradient(
to right,
var(--_slider-track-color) calc(var(--slider-from, 0) * 100%),
var(--slider-fill-color, var(--helix-color-primary)) calc(var(--slider-from, 0) * 100%),
var(--slider-fill-color, var(--helix-color-primary)) calc(var(--slider-to, 1) * 100%),
var(--_slider-track-color) calc(var(--slider-to, 1) * 100%)
)
);
}

:host([range]) [part="control"][data-thumb="end"]::-webkit-slider-runnable-track {
background: transparent;
}

:host([range]) [part="control"][data-thumb="end"]::-moz-range-track {
background: transparent;
}

:host([range]) [part="control"] {
pointer-events: none;
}

:host([range]) [part="control"]::-webkit-slider-thumb {
pointer-events: auto;
}

:host([range]) [part="control"]::-moz-range-thumb {
pointer-events: auto;
}

:host([orientation="vertical"]) [part="field"] {
flex-direction: column;
}

:host([orientation="vertical"]) [part="field"][data-markers] {
grid-template-columns: none;
grid-template-rows: 1fr auto;
}

:host([orientation="vertical"]) [part="control"] {
direction: rtl;
inline-size: var(--slider-length, 9rem);
margin-block: calc(var(--_slider-thumb-length) / 2);
margin-inline: 0;
writing-mode: vertical-lr;

--_slider-track-image: var(
--slider-track-image,
linear-gradient(
to top,
var(--slider-fill-color, var(--helix-color-primary)) calc(var(--slider-fraction, 0) * 100%),
var(--_slider-track-color) calc(var(--slider-fraction, 0) * 100%)
)
);
}

:host([orientation="vertical"]) [part="marker"] {
block-size: var(--helix-border-thick);
inline-size: var(--_slider-track);
inset-block-end: var(--slider-marker-at, 0%);
inset-block-start: auto;
inset-inline-start: 0;
translate: 0 50%;
}

:host([orientation="vertical"]) [part="field"][data-markers] [part="output"] {
grid-column: 1;
grid-row: 2;
}

:host([orientation="vertical"]) [part="markers"] {
align-self: stretch;
block-size: auto;
inline-size: var(--_slider-track);
justify-self: center;
margin-block: calc(var(--_slider-thumb) / 2);
margin-inline: 0;
}

@media print {
:host {
box-shadow: none;
print-color-adjust: exact;
}
}`);var Lz=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},kK=class W extends Y1{static{this.styles=[y,l,vK]}};kK=Lz([G("helix-slider")],kK);var A0=N(`[data-glyph] {
block-size: var(--icon-size, var(--helix-size-icon));
flex: 0 0 auto;
inline-size: var(--icon-size, var(--helix-size-icon));
}`);var HK=N(`:host {
display: block;
padding-block-end: var(--color-picker-inset, var(--helix-space-none));
}

[part="sample"],
[part="swatch"] {
background-image:
linear-gradient(
var(--color-picker-swatch, transparent),
var(--color-picker-swatch, transparent)
),
conic-gradient(
var(--helix-color-surface-sunken) 0 25%,
var(--helix-color-surface) 0 50%,
var(--helix-color-surface-sunken) 0 75%,
var(--helix-color-surface) 0
);
background-size:
100% 100%,
var(--helix-space-sm) var(--helix-space-sm);
border: var(--helix-border-thin) solid var(--helix-color-border);
border-radius: var(--helix-radii-sm);
box-sizing: border-box;
}

[part="grid"] {
aspect-ratio: var(--color-picker-grid-ratio, 1 / 0.7);
background-image:
linear-gradient(to top, hsl(0 0% 0%), transparent),
linear-gradient(to right, hsl(0 0% 100%), transparent),
linear-gradient(hsl(var(--color-picker-hue) 100% 50%), hsl(var(--color-picker-hue) 100% 50%));
border-radius: var(--color-picker-grid-radii, var(--helix-radii-sm));
cursor: crosshair;
position: relative;
touch-action: none;
}

[part="grid-handle"] {
block-size: var(--helix-size-icon-sm);
border: var(--helix-border-thick) solid var(--helix-color-surface);
border-radius: var(--helix-radii-full);
box-shadow: var(--helix-shadow-sm);
inline-size: var(--helix-size-icon-sm);
inset-block-start: calc(100% - var(--color-picker-brightness, 100%));
inset-inline-start: var(--color-picker-saturation, 100%);
pointer-events: none;
position: absolute;
translate: -50% -50%;
}

[part="grid-saturation"],
[part="grid-brightness"] {
appearance: none;
background: none;
inline-size: 100%;
inset: 0;
margin: var(--helix-space-none);
opacity: 0;
pointer-events: none;
position: absolute;
}

[part="grid"]:has(:focus-visible) {
outline: var(--helix-size-focus-ring) solid var(--helix-color-focus-ring);
outline-offset: var(--helix-size-focus-offset);
}

[part="controls"] {
align-items: center;
display: flex;
gap: var(--helix-space-xs);
padding-block-start: var(--helix-space-sm);
padding-inline: var(--color-picker-inset, var(--helix-space-none));
}

[part="sample"] {

appearance: none;
background-color: transparent;
block-size: var(--color-picker-sample-size, 36px);
box-sizing: border-box;
cursor: copy;
flex: none;
font: inherit;
inline-size: var(--color-picker-sample-size, 36px);
padding: var(--helix-space-none);
position: relative;
transition: scale var(--helix-duration-fast) var(--helix-easing-emphasized);
}

[part="sample"]:disabled {
cursor: not-allowed;
}

[part="sample"]:focus-visible {
outline: var(--helix-size-focus-ring) solid var(--helix-color-focus-ring);
outline-offset: var(--helix-size-focus-offset);
}

[part="sample"][data-copied] {
scale: 0.94;
}

[part="sample"][data-copied]::after {
background-color: var(--helix-color-surface-overlay);
block-size: 100%;
content: "";
inset: 0;
mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23000' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M5 13l4 4L19 7'/%3E%3C/svg%3E");
mask-position: center;
mask-repeat: no-repeat;
mask-size: 60%;
position: absolute;
}

[part="channels"] {
display: flex;
flex: 1 1 auto;
flex-direction: column;
gap: var(--helix-space-sm);
min-inline-size: 0;
}

[part="channel"]::part(label) {
block-size: 1px;
clip-path: inset(50%);
inline-size: 1px;
overflow: hidden;
padding: var(--helix-space-none);
position: absolute;
white-space: nowrap;
}

[part="channel"][data-channel="hue"] {
--slider-track-image: linear-gradient(
to right,
hsl(0 100% 50%),
hsl(60 100% 50%),
hsl(120 100% 50%),
hsl(180 100% 50%),
hsl(240 100% 50%),
hsl(300 100% 50%),
hsl(360 100% 50%)
);
}

[part="channel"][data-channel="alpha"] {
--slider-track-image:
linear-gradient(to right, transparent, hsl(var(--color-picker-hue) 100% 50%)),
conic-gradient(
var(--helix-color-surface-sunken) 0 25%,
var(--helix-color-surface) 0 50%,
var(--helix-color-surface-sunken) 0 75%,
var(--helix-color-surface) 0
);
background-size:
100% 100%,
var(--helix-space-sm) var(--helix-space-sm);
}

[part="channel"] {
--slider-fill-color: transparent;
--slider-track-color: transparent;
}

[part="footer"]:empty {
display: none;
}

[part="footer"] {
display: flex;
gap: var(--helix-space-xs);
margin-block-start: var(--helix-space-sm);
padding-inline: var(--color-picker-inset, var(--helix-space-none));
}

[part="value"] {
all: unset;
background-color: var(--helix-color-surface-sunken);

block-size: var(--helix-size-control);
border: var(--helix-border-thin) solid var(--helix-color-border);
border-radius: var(--helix-radii-sm);
box-sizing: border-box;
color: var(--helix-color-foreground);
flex: 1 1 auto;
font-family: var(--helix-font-sans);
font-size: var(--helix-text-control);
font-weight: var(--helix-weight-medium);
min-inline-size: 0;
padding-inline: var(--helix-space-xs);
transition: border-color var(--helix-duration-fast) var(--helix-easing-standard);
}

[part="value"]:hover {
border-color: var(--helix-color-foreground-muted);
}

[part="value"]:focus-visible {
border-color: var(--helix-color-primary);
outline: var(--helix-size-focus-ring) solid var(--helix-color-focus-ring);
outline-offset: 0;
}

:host([invalid]) [part="value"],
:host([invalid]) [part="value"]:hover,
:host([invalid]) [part="value"]:focus-visible {
border-color: var(--helix-color-danger);
outline-color: var(--helix-color-danger);
}

[part="actions"] {
display: flex;
flex: 1 1 auto;
}

[part="actions"] helix-button {
flex: 1 1 0;
}

::slotted([slot="eyedropper-icon"]) {
block-size: var(--icon-size, var(--helix-size-icon));
flex: 0 0 auto;
inline-size: var(--icon-size, var(--helix-size-icon));
}

[part="format"] {
font-family: var(--helix-font-mono);
font-variant-caps: all-small-caps;
}

[part="swatches"] {
border-block-start: var(--helix-border-thin) solid var(--helix-color-border);
display: flex;
flex-wrap: wrap;
gap: var(--helix-space-2xs);
margin-block-start: var(--helix-space-sm);
padding-block-start: var(--helix-space-sm);

padding-inline: var(--color-picker-inset, var(--helix-space-none));
}

[part="swatch"] {
block-size: var(--color-picker-swatch-size, var(--helix-size-icon-lg));
cursor: pointer;
inline-size: var(--color-picker-swatch-size, var(--helix-size-icon-lg));
padding: var(--helix-space-none);
}

@media (prefers-reduced-motion: reduce) {
[part="eyedropper"],
[part="format"],
[part="value"] {
transition: none;
}
}

@media (prefers-reduced-motion: reduce) {

[part="sample"] {
transition: none;
}

[part="sample"][data-copied] {
scale: 1;
}
}

:host(:disabled) {
cursor: not-allowed;
opacity: 0.5;
}

@media print {
:host {
box-shadow: none;
print-color-adjust: exact;
}
}`);var Mz=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},uK=class W extends H0{static{this.tier="helix-"}static{this.styles=[A0,HK]}};uK=Mz([G("helix-color-picker")],uK);var hK=N(`:host {
display: block;
}

[part="field"] {
align-items: center;
background-color: var(--color-input-background-color, var(--helix-color-well));
block-size: var(--helix-size-control);
border: var(--helix-border-thin) solid var(--helix-color-border);
border-radius: var(--helix-radii-sm);
display: flex;
gap: var(--helix-space-2xs);
overflow: hidden;
padding-inline-start: var(--helix-space-xs);
transition:
background-color var(--helix-duration-fast) var(--helix-easing-standard),
border-color var(--helix-duration-fast) var(--helix-easing-standard);
}

[part="control"] {
all: unset;
box-sizing: border-box;
color: var(--helix-color-foreground);
flex: 1 1 auto;
font-family: var(--helix-font-sans);
font-size: var(--helix-text-md);
font-weight: var(--helix-weight-medium);
min-inline-size: 0;
}

:host(:not(:disabled)) [part="field"]:hover {
border-color: var(--helix-color-primary);
}

:host(:focus-within) [part="field"],
:host(:focus-within) [part="field"]:hover {
border-color: var(--helix-color-primary);
outline: var(--helix-size-focus-ring) solid var(--helix-color-focus-ring);
outline-offset: 0;
}

:host(:disabled) [part="field"] {
color: var(--helix-color-foreground-subtle);
}

[part="trigger"] {
align-items: stretch;
all: unset;
align-self: stretch;
box-sizing: border-box;
cursor: pointer;
display: flex;
flex: none;
}

[part="trigger"]:focus-visible {
outline: var(--helix-size-focus-ring) solid var(--helix-color-focus-ring);
outline-offset: calc(var(--helix-size-focus-ring) * -1);
}

:host(:disabled) [part="trigger"] {
cursor: not-allowed;
}

[part="preview"] {
background-image:
linear-gradient(var(--color-input-swatch, transparent), var(--color-input-swatch, transparent)),
conic-gradient(
var(--helix-color-surface-sunken) 0 25%,
var(--helix-color-surface) 0 50%,
var(--helix-color-surface-sunken) 0 75%,
var(--helix-color-surface) 0
);
background-size:
100% 100%,
var(--helix-space-sm) var(--helix-space-sm);
border-inline-start: var(--helix-border-thin) solid var(--helix-color-border);
box-sizing: border-box;
display: block;
inline-size: var(--helix-size-control);
}

[part="surface"] {
background-color: var(--helix-color-surface-overlay);
border: var(--color-input-border-width, var(--helix-border-floating)) solid
var(--color-input-border-color, var(--helix-color-border));
border-radius: var(--helix-radii-sm);
box-shadow: var(--color-input-shadow, var(--helix-shadow-floating));
inline-size: var(--color-input-panel-size, 264px);
inset: auto;
margin: var(--helix-space-none);
overflow: hidden;
padding: var(--helix-space-none);
position: absolute;
}

[part="picker"] {
--color-picker-grid-radii: var(--helix-radii-none);
--color-picker-inset: var(--helix-space-sm);

display: block;
}

[part="surface"] {
--_travel: calc(var(--helix-space-2xs) * -1);
opacity: 0;
scale: 0.96;
transform: translateY(var(--_travel));
transition:
opacity var(--helix-duration-fast) var(--helix-easing-standard),
scale var(--helix-duration-fast) var(--helix-easing-emphasized),
transform var(--helix-duration-fast) var(--helix-easing-emphasized),
display var(--helix-duration-fast) allow-discrete,
overlay var(--helix-duration-fast) allow-discrete;
}

[part="surface"][data-placement^="top"] {
--_travel: var(--helix-space-2xs);
transform-origin: var(--floating-arrow-x, 50%) 100%;
}

[part="surface"][data-placement^="bottom"] {
transform-origin: var(--floating-arrow-x, 50%) 0;
}

[part="surface"][data-placed] {
opacity: 1;
scale: 1;
transform: none;
}

[part="surface"][hidden] {
display: none;
}

@media (prefers-reduced-motion: reduce) {
[part="field"] {
transition: none;
}

[part="surface"],
[part="surface"][data-placed] {
scale: 1;
transform: none;
transition: none;
}
}

:host([variant="swatch"]) [part="field"] {
background-color: transparent;
border: none;
inline-size: max-content;
padding-inline: var(--helix-space-none);
}

:host([variant="swatch"]) [part="trigger"] {
block-size: var(--color-input-swatch-size, var(--helix-size-control));
inline-size: var(--color-input-swatch-size, var(--helix-size-control));
}

:host([variant="swatch"]:focus-within) [part="field"] {
outline: none;
}

:host([variant="swatch"]) [part="preview"] {
block-size: 100%;
border: var(--helix-border-thin) solid var(--helix-color-border);
border-radius: var(--color-input-swatch-radii, var(--helix-radii-sm));
inline-size: 100%;
}

:host(:state(invalid)) [part="field"],
:host(:state(invalid)) [part="field"]:hover,
:host(:state(invalid):focus-within) [part="field"],
:host(:state(invalid):focus-within) [part="field"]:hover {
border-color: var(--helix-color-danger);
outline-color: var(--helix-color-danger);
}

slot[name="start"]::slotted(*),
slot[name="end"]::slotted(*) {
color: var(--helix-color-foreground-subtle);
flex: 0 0 auto;
}

@media print {
:host {
box-shadow: none;
print-color-adjust: exact;
}
}`);var Sz=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},xK=class W extends W1{static{this.tier="helix-"}static{this.styles=[y,l,hK]}};xK=Sz([G("helix-color-input")],xK);var yK=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},x7=class W extends A{constructor(){super(...arguments);this.label=""}willUpdate(J){super.willUpdate(J),L(this.internals,{label:this.label,role:"group"})}render(){return F`<span part="label" aria-hidden="true">
        <slot name="label">${this.label}</slot>
      </span>
      <div part="items"><slot></slot></div>`}};yK([q()],x7.prototype,"label",void 0);x7=yK([G("helix-headless-option-group")],x7);var QJ=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},u0=class W extends A{constructor(){super(...arguments);this.disabled=!1,this.active=!1,this.seeded=this.hasAttribute("selected"),this.selected=!1,this.label="",this.value="",this.alternate="",this.alternateLabel=""}get defaultSelected(){return this.seeded}set defaultSelected(J){this.seeded=J}get text(){return[...this.childNodes].filter((J)=>!(J instanceof Element)||J.slot==="").map((J)=>J.textContent??"").join("").trim()}select(){if(this.disabled)return;this.dispatchEvent(new m({value:this.value}))}willUpdate(J){super.willUpdate(J),this.toggleState("selected",this.selected)}render(){return this.internals.role="option",this.internals.ariaSelected=String(this.selected),this.internals.ariaDisabled=this.disabled?"true":null,this.internals.ariaDescription=this.alternate!==""&&this.alternateLabel!==""?this.alternateLabel:null,F`<div part="item" @click=${()=>this.select()}>
      <slot name="start"></slot>
      <span part="text">
        <span part="label"><slot></slot></span>
        ${this.description?F`<span part="description">${this.description}</span>`:z}
      </span>
      <slot name="end"></slot>
    </div>`}};QJ([q({reflect:!0,type:Boolean})],u0.prototype,"disabled",void 0);QJ([q()],u0.prototype,"description",void 0);QJ([q({attribute:"data-active",reflect:!0,type:Boolean})],u0.prototype,"active",void 0);QJ([q({type:Boolean})],u0.prototype,"selected",void 0);QJ([q()],u0.prototype,"label",void 0);QJ([q()],u0.prototype,"value",void 0);QJ([q()],u0.prototype,"alternate",void 0);QJ([q({attribute:"alternate-label"})],u0.prototype,"alternateLabel",void 0);u0=QJ([G("helix-headless-option")],u0);var T1=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},mK=new Set(["ArrowDown","ArrowUp","End","Home"]),l6=new Map,pK="helix-filter-match",nK=()=>typeof CSS!=="undefined"&&("highlights"in CSS)&&typeof Highlight!=="undefined",gK=()=>{if(!nK())return;let W=[...l6.values()].flat();if(W.length===0){CSS.highlights.delete(pK);return}CSS.highlights.set(pK,new Highlight(...W))},Rz=(W,J)=>{let Z=document.createTreeWalker(W,NodeFilter.SHOW_TEXT),K=[],Q="";for(let O=Z.nextNode();O!==null;O=Z.nextNode())K.push(O),Q+=O.nodeValue??"";let Y=Q.toLowerCase().indexOf(J);if(Y<0)return[];let X=document.createRange(),$=0,V=!1;for(let O of K){let B=O.nodeValue?.length??0;if(!V&&Y<$+B)X.setStart(O,Y-$),V=!0;if(V&&Y+J.length<=$+B)return X.setEnd(O,Y+J.length-$),[X];$+=B}return[]},h0=class W extends z0(u(k(E))){constructor(){super(...arguments);this.autocomplete="off",this.defaultFilter="",this.filterState=void 0,this.filterable=!1,this.filterLabel="Filter",this.multiple=!1,this.emptyText="No matches",this.activeValue="",this.forwarded=!1,this.hasMatches=!0,this.counted=!1,this.cascade=new j1(this,{items:()=>this.options}),this.handleSelection=(J)=>{J.stopPropagation(),this.activeValue=J.detail.value,this.choose(J.detail.value)},this.handleKeydown=(J)=>{let Z=this.shown.filter(($)=>!$.disabled);if(Z.length===0)return;if(J.key===" "||J.key==="Enter"){if(J.preventDefault(),this.activeValue!=="")this.choose(this.activeValue);return}if(!mK.has(J.key)&&J.key!=="Enter")return;J.preventDefault();let K=this.currentValue,Q=Z.findIndex(($)=>$.value===K),Y=Q;if(J.key==="ArrowDown")Y=Q<0?0:(Q+1)%Z.length;else if(J.key==="ArrowUp")Y=Q<0?Z.length-1:(Q-1+Z.length)%Z.length;else if(J.key==="Home")Y=0;else Y=Z.length-1;let X=Z[Y];if(!X)return;if(this.activeValue=X.value,!this.multiple&&!this.forwarded)this.choose(X.value)},this.handleFilter=(J)=>{J.stopPropagation();let Z=J.target;if(this.requestFilter(Z.value),Z.value!==this.filter)Z.value=this.filter},this.handleFilterKeydown=(J)=>{if(J.key==="Escape"&&this.filter!==""){J.stopPropagation(),J.preventDefault(),this.requestFilter("");return}if(!mK.has(J.key))return;J.stopPropagation(),this.navigate(J)}}get filter(){return this.filterState??this.defaultFilter}set filter(J){let Z=this.filter;this.filterState=J,this.requestUpdate("filter",Z)}get selectedIndex(){return this.options.findIndex((J)=>J.selected)}set selectedIndex(J){let Z=this.options[J];this.value=Z?.value??""}get type(){return this.multiple?"select-multiple":"select-one"}get options(){return this.collect(this.children)}collect(J){let Z=[];for(let K of J)if(K instanceof u0)Z.push(K);else if(K instanceof HTMLSlotElement)Z.push(...this.collect(K.assignedElements({flatten:!0})));else Z.push(...this.collect(K.children));return Z}get groups(){let J=[],Z=(K)=>{for(let Q of K){if(Q instanceof x7)J.push(Q);if(Q instanceof HTMLSlotElement)Z(Q.assignedElements({flatten:!0}));else Z(Q.children)}};return Z(this.children),J}get shown(){return this.options.filter((J)=>!J.hidden)}get values(){return this.value===""?[]:this.value.split(",")}choose(J){let Z=this.values,Q=(this.multiple?Z.includes(J)?Z.filter((Y)=>Y!==J):[...Z,J]:[J]).join(",");if(Q===this.value)return;this.requestValue(Q)}navigate(J){this.forwarded=!0;try{this.handleKeydown(J)}finally{this.forwarded=!1}}reveal(){let J=this.renderRoot?.querySelector('[part="items"]'),Z=this.options.find((K)=>K.selected&&!K.hidden);if(!J||!Z)return;for(let K=0;K<2;K+=1){let Q=J.getBoundingClientRect(),Y=Z.getBoundingClientRect();if(Q.height===0||Y.height===0)return;let X=Y.top+Y.height/2-(Q.top+Q.height/2);if(Math.abs(X)<1)return;J.scrollTop+=X}}place(){let J=this.filter.trim().toLowerCase(),Z=new Set(this.values);for(let $ of this.options)$.hidden=J!==""&&!$.text.toLowerCase().includes(J),$.selected=Z.has($.value);for(let $ of this.groups){let V=this.collect($.children);$.hidden=V.length>0&&V.every((O)=>O.hidden)}let K=this.shown;if((J!==""||this.activeValue!=="")&&!K.some(($)=>$.value===this.activeValue))this.activeValue=K.find(($)=>!$.disabled)?.value??"";for(let $ of this.options)$.active=$.value===this.activeValue;if(J===""||!nK())l6.delete(this);else l6.set(this,K.flatMap(($)=>Rz($,J)));gK();let Y=K.length>0;if(Y!==this.hasMatches)this.hasMatches=Y;this.counted=!0;let X=K.find(($)=>$.value===this.activeValue);if(X){let $=this.renderRoot.querySelector('[part="items"]');R7(X,{padding:4,...$?{scroller:$}:{}})}}sync(){this.internals.setFormValue(this.value===""?null:this.value),this.reportRequired(this.value==="","Choose one to continue.","items")}connectedCallback(){super.connectedCallback(),this.addEventListener("helix-select",this.handleSelection),this.addEventListener("keydown",this.handleKeydown)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("helix-select",this.handleSelection),this.removeEventListener("keydown",this.handleKeydown),l6.delete(this),gK()}willUpdate(J){super.willUpdate(J),L(this.internals,{label:this.label,role:"listbox"}),this.internals.ariaMultiSelectable=this.multiple?"true":null}get currentValue(){return this.activeValue||(this.value.split(",")[0]??"")}linkActive(){let J=this.renderRoot.querySelector(this.filterable?'[part="search-field"]':'[part="items"]');if(!J||!("ariaActiveDescendantElement"in J))return;let Z=this.options.find((K)=>K.value===this.currentValue);J.ariaActiveDescendantElement=Z??null}updated(J){super.updated(J),this.place(),this.sync(),this.linkHost(),this.linkActive()}requestFilter(J){if(J===this.filter)return!0;return h({apply:(Z)=>{let K=this.filter;this.filterState=Z,this.requestUpdate("filter",K)},event:(Z)=>new _J({value:Z}),host:this,next:J})}static{this.shadowRootOptions={...E.shadowRootOptions,delegatesFocus:!0}}renderFilterIcon(){return F`<slot name="filter-icon">
      <svg part="filter-mark" fill="currentColor" viewBox=${i5.viewBox}>
        ${S(i5.content)}
      </svg>
    </slot>`}render(){return F`${this.renderGroupLabel()}
      ${this.filterable?F`<div part="search">
              <span part="filter-icon" aria-hidden="true">
                ${this.renderFilterIcon()}
              </span>
              <input
                part="search-field"
                type="text"
                autocomplete=${this.autocomplete||z}
                spellcheck="false"
                .value=${this.filter}
                placeholder=${this.filterLabel}
                aria-label=${this.filterLabel}
                aria-controls="items"
                ?disabled=${this.isDisabled}
                @input=${this.handleFilter}
                @keydown=${this.handleFilterKeydown}
              />
            </div>`:""}
      <div
        part="items"
        id="items"
        aria-busy=${this.loading?"true":z}
        ${""}
        tabindex=${this.isDisabled?-1:0}
      >
        <slot @slotchange=${()=>this.place()}></slot>
        ${this.renderStatus(this.counted&&!this.loading?this.filter===""?this.options.length>0:this.hasMatches:!0)}
      </div>
      ${this.renderHint()}${this.renderFeedback()}`}};T1([q()],h0.prototype,"autocomplete",void 0);T1([q()],h0.prototype,"filter",null);T1([q({attribute:"default-filter"})],h0.prototype,"defaultFilter",void 0);T1([q({attribute:"filterable",reflect:!0,type:Boolean})],h0.prototype,"filterable",void 0);T1([q({attribute:"filter-label"})],h0.prototype,"filterLabel",void 0);T1([q({reflect:!0,type:Boolean})],h0.prototype,"multiple",void 0);T1([q({attribute:"empty-text"})],h0.prototype,"emptyText",void 0);T1([U()],h0.prototype,"activeValue",void 0);T1([U()],h0.prototype,"hasMatches",void 0);T1([U()],h0.prototype,"counted",void 0);h0=T1([G("helix-headless-listbox")],h0);var Ez=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},c6=class W extends T7(A){constructor(){super(...arguments);this.dismissLabel="Remove"}render(){return F`<slot name="prefix" part="prefix"></slot>
      <slot></slot>
      ${this.dismissible?F`<button
            part="dismiss"
            type="button"
            aria-label=${this.dismissLabel}
            @click=${()=>this.dismiss()}
          >
            <svg part="dismiss-mark" fill="currentColor" viewBox=${B0.viewBox} aria-hidden="true">
              ${S(B0.content)}
            </svg>
          </button>`:z}`}};c6=Ez([G("helix-headless-tag")],c6);var T0=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},wz=(W)=>!W.inputType?.startsWith("delete"),X0=class W extends g(u(k(E))){constructor(){super(...arguments);this.autocomplete="off",this.placeholder="",this.multiple=!1,this.creatable=!1,this.suggest=!1,this.createLabel="Add",this.removeLabel="Remove",this.maxTags=0,this.listLabel="Options",this.loading=!1,this.loadingText="Loading",this.emptyText="No matches",this.typed="",this.suggestion="",this.panel=new d(this,{anchor:()=>this.renderRoot?.querySelector('[part="field"]'),boundary:()=>[this.renderRoot?.querySelector('[part="surface"]'),this.renderRoot?.querySelector('[part="field"]')],offset:()=>4,onDismiss:()=>this.close(),placement:"bottom-start",surface:()=>this.renderRoot?.querySelector('[part="surface"]')}),this.handleInput=(J)=>{J.stopPropagation();let Z=J.target.value;if(this.typed=Z,this.listbox?.requestFilter(Z),this.suggestion=this.suggest&&wz(J)?this.completionFor(Z):"",!this.open)this.requestOpen(!0)},this.handleKeydown=(J)=>{if(this.isDisabled)return;if(J.key==="Escape"){if(this.open)J.preventDefault(),this.close();return}if(J.key==="Tab"){if(this.open)this.requestOpen(!1);return}if(J.key==="Backspace"&&this.multiple&&this.typed===""){let Z=this.values.at(-1);if(Z!==void 0)J.preventDefault(),this.drop(Z);return}if(J.key==="Enter"&&this.creation!==""&&!this.showing){J.preventDefault(),this.create();return}if(!this.open&&(J.key==="ArrowDown"||J.key==="ArrowUp"))this.requestOpen(!0);this.listbox?.navigate(J)},this.handleChange=(J)=>{J.stopPropagation();let{value:Z}=J.detail;if(!this.requestValue(Z))return;if(this.typed="",this.suggestion="",this.listbox?.requestFilter(""),!this.multiple)this.close()},this.handleFieldClick=(J)=>{if(this.isDisabled)return;if(J.composedPath().some((Z)=>Z instanceof HTMLElement&&Z.localName==="helix-tag"))return;if(this.renderRoot.querySelector('[part="control"]')?.focus(),!this.open)this.requestOpen(!0)},this.handleDismiss=(J)=>{J.stopPropagation();let Z=J.currentTarget;this.drop(Z.dataset.value??"")}}get selectedIndex(){return this.listbox?.selectedIndex??-1}set selectedIndex(J){let Z=this.listbox;if(Z)Z.selectedIndex=J}get type(){return this.multiple?"select-multiple":"select-one"}get listbox(){return this.renderRoot?.querySelector('[part="listbox"]')??null}get values(){return this.value===""?[]:this.value.split(",")}get chosen(){let J=this.listbox?.options??[],Z=J.length>0,K=new Map(J.map((Q)=>[Q.value,Q.text]));return this.values.filter((Q)=>Z||K.has(Q)).map((Q)=>({text:K.get(Q)??Q,value:Q}))}get showing(){return(this.listbox?.options??[]).some((J)=>!J.hidden)}get creation(){let J=this.typed.trim();if(!this.creatable||J==="")return"";return(this.listbox?.options??[]).some((K)=>K.text.trim().toLowerCase()===J.toLowerCase())?"":J}create(){let J=this.creation;if(J==="")return;if(!this.dispatchEvent(new I8({value:J})))return;let Z=this.multiple?[...this.values,J].join(","):J;if(!this.requestValue(Z))return;if(this.typed="",this.suggestion="",this.listbox?.requestFilter(""),!this.multiple)this.close()}get shown(){let J=this.chosen;return this.maxTags>0?J.slice(0,this.maxTags):J}get restCount(){return Math.max(0,this.chosen.length-this.shown.length)}get word(){return this.chosen[0]?.text??""}drop(J){this.requestValue(this.values.filter((Z)=>Z!==J).join(","))}close(){if(!this.open)return;this.requestOpen(!1),this.renderRoot.querySelector('[part="control"]')?.focus()}completionFor(J){if(J==="")return"";let Z=J.toLowerCase(),K=(this.listbox?.options??[]).find((Q)=>!Q.hidden&&!Q.disabled&&Q.text.toLowerCase().startsWith(Z));return K&&K.text.length>J.length?K.text:""}sync(){this.internals.setFormValue(this.value===""?null:this.value),this.reportRequired(this.value==="","Choose one to continue.","control")}willUpdate(J){super.willUpdate(J),this.internals.ariaExpanded=this.open?"true":"false"}updated(J){super.updated?.(J),this.sync();let Z=this.renderRoot.querySelector('[part="control"]'),K=this.multiple||this.open?this.suggestion||this.typed:this.word;if(Z&&Z.value!==K)Z.value=K;if(Z&&this.suggestion!=="")Z.setSelectionRange(this.typed.length,this.suggestion.length);if(this.open)this.panel.show();else this.panel.hide(),this.typed="",this.suggestion="",this.listbox?.requestFilter("")}renderListbox(){return T`<${this.tag("listbox")}
      part="listbox"
      id="listbox"
      exportparts="empty: listbox-empty, feedback: listbox-feedback, filter-icon: listbox-filter-icon,
        filter-mark: listbox-filter-mark, hint: listbox-hint, items: listbox-items,
        label: listbox-label, loading: listbox-loading, search: listbox-search,
        search-field: listbox-search-field"
      aria-label=${this.listLabel}
      empty-text=${this.emptyText}
      loading-text=${this.loadingText}
      ?loading=${this.loading}
      ?multiple=${this.multiple}
      .value=${this.value}
      @helix-before-change=${this.handleChange}
      @change=${this.stopInner}
      @input=${this.stopInner}
    >
      <!-- The field's words are read off the options, and on the first
           render there are none: the slot has not been assigned yet, so a
           combobox with a value came up empty. Assignment changes no
           property, so nothing else would schedule the update that fixes
           it. Select was fixed for exactly this. -->
      <slot @slotchange=${()=>this.requestUpdate()}></slot>
    </${this.tag("listbox")}>`}renderTag(J){return T`<${this.tag("tag")}
                    part="tag"
      exportparts="dismiss: tag-dismiss, dismiss-mark: tag-dismiss-mark, prefix: tag-prefix"
                    data-value=${J.value}
                    dismiss-label=${this.removeLabel}
                    ?dismissible=${!this.isDisabled}
                    @helix-dismiss=${this.handleDismiss}
                    >${J.text}</${this.tag("tag")}
                  >`}renderIndicator(){return T`<slot name="indicator">
      <svg part="indicator" fill="currentColor" viewBox=${_0.viewBox} aria-hidden="true">
        ${S(_0.content)}
      </svg>
    </slot>`}render(){return T`${this.renderLabel()}
      <div part="field" @click=${this.handleFieldClick}>
        <slot name="start"></slot>
        ${this.multiple&&this.chosen.length>0?T`<span part="tags">
                ${this.shown.map((J)=>this.renderTag(J))}
                ${this.restCount>0?T`<span part="rest">${`+${this.restCount}`}</span>`:z}
              </span>`:z}
        <input
          part="control"
          id="control"
          type="text"
          role="combobox"
          autocomplete=${this.autocomplete||z}
          spellcheck="false"
          aria-controls="listbox"
          aria-autocomplete=${this.suggest?"both":"list"}
          aria-expanded=${this.open?"true":"false"}
          aria-describedby=${this.describedBy??z}
          aria-multiselectable=${this.multiple?"true":z}
          placeholder=${(this.chosen.length>0?"":this.placeholder)||z}
          ?disabled=${this.isDisabled}
          .value=${this.multiple||this.open?this.suggestion||this.typed:this.word}
          @input=${this.handleInput}
          @keydown=${this.handleKeydown}
        />
        <slot name="end"></slot>
        ${this.renderIndicator()}
      </div>
      <div part="surface" popover="manual" ?hidden=${!this.open}>
        ${this.renderListbox()}
        ${this.creation===""?z:T`<button part="create" type="button" @click=${()=>this.create()}>
                ${this.createLabel} "${this.creation}"
              </button>`}
      </div>
      ${this.renderHint()}${this.renderFeedback()}`}};T0([q()],X0.prototype,"autocomplete",void 0);T0([q()],X0.prototype,"placeholder",void 0);T0([q({type:Boolean})],X0.prototype,"multiple",void 0);T0([q({type:Boolean})],X0.prototype,"creatable",void 0);T0([q({type:Boolean})],X0.prototype,"suggest",void 0);T0([q({attribute:"create-label"})],X0.prototype,"createLabel",void 0);T0([q({attribute:"remove-label"})],X0.prototype,"removeLabel",void 0);T0([q({attribute:"max-tags",type:Number})],X0.prototype,"maxTags",void 0);T0([q({attribute:"list-label"})],X0.prototype,"listLabel",void 0);T0([q({reflect:!0,type:Boolean})],X0.prototype,"loading",void 0);T0([q({attribute:"loading-text"})],X0.prototype,"loadingText",void 0);T0([q({attribute:"empty-text"})],X0.prototype,"emptyText",void 0);T0([U()],X0.prototype,"typed",void 0);T0([U()],X0.prototype,"suggestion",void 0);X0=T0([G("helix-headless-combobox")],X0);var lK=N(`:host {
display: flex;
flex-direction: column;
gap: var(--helix-space-2xs);
}

[part="items"] {

--option-radii: var(--helix-radii-none);

background-color: var(--helix-color-surface);
border: var(--helix-border-thin) solid var(--helix-color-border);
border-radius: var(--helix-radii-sm);
display: flex;
flex-direction: column;
gap: var(--helix-space-none);
max-block-size: var(--listbox-max-block-size, 14rem);
overflow-y: auto;

padding-block: var(--helix-space-2xs);
padding-inline: var(--helix-space-none);
}

[part="items"]:focus-visible {
border-color: var(--helix-color-primary);
outline: var(--helix-size-focus-ring) solid var(--helix-color-focus-ring);
outline-offset: 0;
}

:host(:state(invalid)) [part="items"],
:host(:state(invalid)) [part="items"]:focus-visible {
border-color: var(--helix-color-danger);
outline-color: var(--helix-color-danger);
}

:host(:disabled) {
opacity: 0.5;
}

:host(:disabled) [part="items"] {
cursor: not-allowed;
}

[part="empty"],
[part="loading"] {
color: var(--helix-color-foreground-subtle);
font-family: var(--helix-font-sans);
font-size: var(--helix-text-sm);
margin: var(--helix-space-none);
padding-block: var(--helix-space-xs);
padding-inline: var(--helix-space-xs);
text-align: center;
}

[part="filter-icon"] {
align-items: center;
color: var(--helix-color-foreground-subtle);
display: inline-flex;
flex: 0 0 auto;
}

[part="filter-icon"] svg,
slot[name="filter-icon"]::slotted(*) {
--icon-size: var(--helix-size-icon-sm);

block-size: var(--helix-size-icon-sm);
inline-size: var(--helix-size-icon-sm);
}

[part="search"] {
align-items: center;
border-block-end: var(--helix-border-thin) solid var(--helix-color-border);
display: flex;
gap: var(--helix-space-2xs);
padding: var(--helix-space-2xs);
padding-inline-start: var(--helix-space-xs);
}

[part="search-field"] {
appearance: none;
flex: 1 1 auto;
min-inline-size: 0;
background-color: transparent;
block-size: var(--helix-size-control-sm);
border: none;
box-sizing: border-box;
color: var(--helix-color-foreground);
font-family: var(--helix-font-sans);
font-size: var(--helix-text-sm);
font-weight: var(--helix-weight-medium);
inline-size: 100%;
padding-inline: var(--helix-space-xs);
}

[part="search-field"]:focus-visible {
outline: none;
}

:host([loading]) [part="items"] {
opacity: 0.5;
}

@media print {
:host {
box-shadow: none;
print-color-adjust: exact;
}
}`);var bz=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},cK=class W extends h0{static{this.styles=[y,l,lK]}};cK=bz([G("helix-listbox")],cK);var dK=N(`:host {
align-items: center;
background-color: var(--tag-background-color, var(--_tag-fill));
block-size: var(--_tag-height);
border: var(--helix-border-thin) solid var(--tag-border-color, var(--_tag-edge));
border-radius: var(--tag-radii, var(--helix-radii-sm));
color: var(--tag-foreground-color, var(--_tag-label));
display: inline-flex;
font-size: var(--_tag-text);
font-weight: var(--helix-weight-medium);
gap: var(--helix-space-2xs);
line-height: var(--helix-leading-tight);
padding-inline: var(--_tag-inset);
white-space: nowrap;

--_tag-height: var(--helix-size-tag);

--_tag-color: var(--helix-color-foreground-muted);
--_tag-text: var(--helix-text-xs);
--_tag-inset: var(--helix-space-xs);

--_tag-fill: color-mix(in srgb, var(--_tag-color) 14%, var(--helix-color-background));
--_tag-edge: color-mix(in srgb, var(--_tag-color) 28%, var(--helix-color-background));
--_tag-label: color-mix(in oklab, var(--_tag-color) 55%, var(--helix-color-foreground));
}

slot:not([name]) {
display: block;
min-inline-size: 0;
overflow: hidden;
text-overflow: ellipsis;
}

slot:not([name])::slotted(helix-icon) {
vertical-align: middle;
}

:host([emphasis="solid"]) {
--_tag-fill: color-mix(in oklab, var(--_tag-color) 82%, var(--helix-color-foreground));
--_tag-edge: var(--_tag-fill);
--_tag-label: var(--helix-color-foreground-inverse);
}

:host([emphasis="outlined"]) {
--_tag-fill: transparent;
--_tag-edge: color-mix(in srgb, var(--_tag-color) 45%, var(--helix-color-background));
}

:host([tone="primary"]) {
--_tag-color: var(--helix-color-primary);
}

:host([tone="accent"]) {
--_tag-color: var(--helix-color-accent);
}

:host([tone="info"]) {
--_tag-color: var(--helix-color-info);
}

:host([tone="success"]) {
--_tag-color: var(--helix-color-success);
}

:host([tone="warning"]) {
--_tag-color: var(--helix-color-warning);
}

:host([tone="danger"]) {
--_tag-color: var(--helix-color-danger);
}

[part="dismiss"] {

font: inherit;
background: none;
border: none;
border-radius: var(--helix-radii-sm);
color: inherit;
cursor: pointer;
display: inline-flex;
margin-inline-end: calc(var(--helix-space-2xs) * -1);
padding: var(--helix-space-2xs);
}

[part="dismiss"]:hover {
background-color: color-mix(in oklab, var(--_tag-color) 20%, transparent);
}

[part="dismiss"]:focus-visible {
outline: var(--helix-size-focus-ring) solid var(--helix-color-focus-ring);
outline-offset: var(--helix-size-focus-offset);
}

[part="dismiss"] svg {
block-size: 0.85em;
inline-size: 0.85em;
}

slot[name="prefix"]::slotted(*) {
font-weight: var(--helix-weight-semibold);
margin-inline-end: var(--_tag-inset);
opacity: 0.75;
}

@media print {
:host {
box-shadow: none;
}
}`);var uZ=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},d6=class W extends c6{static{this.styles=dK}};uZ([q({reflect:!0})],d6.prototype,"tone",void 0);uZ([q({reflect:!0})],d6.prototype,"emphasis",void 0);d6=uZ([G("helix-tag")],d6);var iK=N(`:host {
display: flex;
flex-direction: column;
gap: var(--helix-space-2xs);
position: relative;
}

[part="field"] {
align-items: center;
background-color: var(--combobox-background-color, var(--helix-color-well));
block-size: var(--helix-size-control);
border: var(--helix-border-thin) solid var(--helix-color-border);
border-radius: var(--helix-radii-sm);
box-sizing: border-box;
display: flex;
gap: var(--helix-space-xs);
padding-inline: var(--helix-space-xs);
transition:
background-color var(--helix-duration-fast) var(--helix-easing-standard),
border-color var(--helix-duration-fast) var(--helix-easing-standard);
}

[part="field"]:has([part="tags"]) {
block-size: auto;
flex-wrap: wrap;
min-block-size: var(--helix-size-control);

padding-block: var(--helix-space-2xs);
padding-inline-end: calc(var(--helix-space-xs) + var(--helix-size-icon));
position: relative;
}

[part="indicator"],
::slotted([slot="indicator"]) {
transition: scale var(--helix-duration-fast) var(--helix-easing-standard);
}

[part="field"]:has([part="tags"]) [part="indicator"],
[part="field"]:has([part="tags"]) ::slotted([slot="indicator"]) {
inset-block-start: 50%;
inset-inline-end: var(--helix-space-xs);
position: absolute;
translate: 0 -50%;
}

[part="tags"] {
display: contents;
}

[part="tag"] {
flex: 0 0 auto;
max-inline-size: 100%;
}

[part="rest"] {
align-self: center;
color: var(--helix-color-foreground-subtle);
flex: 0 0 auto;
font-family: var(--helix-font-sans);
font-size: var(--helix-text-xs);
font-weight: var(--helix-weight-medium);
white-space: nowrap;
}

[part="control"] {
all: unset;
box-sizing: border-box;
color: var(--helix-color-foreground);
flex: 1 1 auto;
font-family: var(--helix-font-sans);
font-size: var(--helix-text-md);
font-weight: var(--helix-weight-medium);
min-inline-size: 0;
}

[part="field"]:has([part="tags"]) [part="control"] {
flex: 1 1 var(--combobox-control-size, 4ch);
}

[part="control"]::placeholder {
color: var(--helix-color-foreground-subtle);
font-weight: var(--helix-weight-medium);
}

:host(:not(:disabled)) [part="field"]:hover {
border-color: var(--helix-color-primary);
}

:host(:focus-within) [part="field"],
:host(:focus-within) [part="field"]:hover {
border-color: var(--helix-color-primary);
outline: var(--helix-size-focus-ring) solid var(--helix-color-focus-ring);
outline-offset: 0;
}

:host(:state(invalid)) [part="field"],
:host(:state(invalid)) [part="field"]:hover,
:host(:state(invalid):focus-within) [part="field"],
:host(:state(invalid):focus-within) [part="field"]:hover {
border-color: var(--helix-color-danger);
outline-color: var(--helix-color-danger);
}

:host(:disabled) [part="field"] {
color: var(--helix-color-foreground-subtle);
cursor: not-allowed;
opacity: 0.5;
}

[part="indicator"] {
block-size: var(--helix-size-icon);
color: var(--helix-color-foreground-muted);
flex: 0 0 auto;
inline-size: var(--helix-size-icon);
}

:host(:state(open)) [part="indicator"],
:host(:state(open)) ::slotted([slot="indicator"]) {
scale: 1 -1;
}

@media (prefers-reduced-motion: reduce) {
[part="indicator"],
::slotted([slot="indicator"]) {
transition: none;
}
}

slot[name="start"]::slotted(*),
slot[name="end"]::slotted(*) {
--icon-size: var(--helix-size-icon);

color: var(--helix-color-foreground-muted);
flex: 0 0 auto;
}

[part="surface"] {
background-color: var(--helix-color-surface-overlay);
border: var(--combobox-border-width, var(--helix-border-floating)) solid
var(--combobox-border-color, var(--helix-color-border));
border-radius: var(--helix-radii-sm);
box-shadow: var(--combobox-shadow, var(--helix-shadow-floating));
box-sizing: border-box;
inline-size: var(--combobox-panel-size, var(--floating-anchor-width, 100%));
inset: auto;
margin: var(--helix-space-none);
max-block-size: var(--floating-available-height, none);
min-inline-size: max-content;
overflow: hidden;
padding: var(--helix-space-none);
position: absolute;
}

[part="create"] {
all: unset;

border-block-start: var(--helix-border-thin) solid var(--helix-color-border);
box-sizing: border-box;
color: var(--helix-color-foreground);
cursor: pointer;
display: block;
font-family: var(--helix-font-sans);
font-size: var(--helix-text-sm);
font-weight: var(--helix-weight-medium);
inline-size: 100%;
padding: var(--helix-space-xs) var(--helix-space-sm);
text-align: start;
transition: background-color var(--helix-duration-fast) var(--helix-easing-standard);
}

[part="create"]:hover {
background-color: light-dark(
color-mix(in oklab, var(--helix-color-foreground) 8%, transparent),
color-mix(in oklab, var(--helix-color-foreground) 12%, transparent)
);
}

[part="create"]:focus-visible {
outline: var(--helix-size-focus-ring) solid var(--helix-color-focus-ring);
outline-offset: calc(var(--helix-size-focus-offset) * -1);
}

[part="listbox"] {
--listbox-background-color: transparent;

border: none;
display: block;
}

[part="surface"] {
--_travel: calc(var(--helix-space-2xs) * -1);

opacity: 0;
scale: 0.96;
transform: translateY(var(--_travel));
transition:
opacity var(--helix-duration-fast) var(--helix-easing-standard),
scale var(--helix-duration-fast) var(--helix-easing-emphasized),
transform var(--helix-duration-fast) var(--helix-easing-emphasized),
display var(--helix-duration-fast) allow-discrete,
overlay var(--helix-duration-fast) allow-discrete;
}

[part="surface"][data-placement^="top"] {
--_travel: var(--helix-space-2xs);

transform-origin: var(--floating-arrow-x, 50%) 100%;
}

[part="surface"][data-placement^="bottom"] {
transform-origin: var(--floating-arrow-x, 50%) 0;
}

[part="surface"][data-placed] {
opacity: 1;
scale: 1;
transform: none;
}

[part="surface"][hidden],
[part="surface"]:not(:popover-open) {
display: none;
}

@media (prefers-reduced-motion: reduce) {
[part="field"] {
transition: none;
}

[part="create"] {
transition: none;
}

[part="surface"],
[part="surface"][data-placed] {
scale: 1;
transform: none;
transition: none;
}
}

@media print {
:host {
box-shadow: none;
print-color-adjust: exact;
}
}`);var fz=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},sK=class W extends X0{static{this.tier="helix-"}static{this.styles=[y,l,iK]}};sK=fz([G("helix-combobox")],sK);var i6=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},y7=class W extends g(A){constructor(){super(...arguments);this.label="",this.persistent=!1,this.commands=new SJ(this,{commands:{"--close":()=>this.close(),"--show":()=>this.show(),"--toggle":()=>this.toggleOpen()}}),this.returned="",this.handleCancel=(J)=>{if(J.preventDefault(),this.persistent)return;this.requestOpen(!1)},this.handleClose=(J)=>{if(this.open)this.requestOpen(!1);this.relayNativeEvent(J)},this.handleBackdrop=(J)=>{let Z=this.dialog;if(!Z||J.target!==Z)return;let K=Z.getBoundingClientRect();if(J.clientX>=K.left&&J.clientX<=K.right&&J.clientY>=K.top&&J.clientY<=K.bottom)return;if(this.persistent){this.refuse();return}this.requestOpen(!1)}}get returnValue(){return this.dialog?.returnValue??this.returned}set returnValue(J){this.returned=J;let Z=this.dialog;if(Z)Z.returnValue=J}get dialog(){return this.renderRoot?.querySelector("dialog")??null}show(){this.requestOpen(!0)}close(J){let Z=this.returnValue;if(J!==void 0)this.returnValue=J;if(!this.requestOpen(!1)&&J!==void 0)this.returnValue=Z}willUpdate(J){super.willUpdate(J),L(this.internals,{label:this.label})}updated(J){super.updated(J);let Z=this.dialog;if(!Z)return;if(this.open&&!Z.open)this.openWhenSlotted(Z);else if(!this.open&&Z.open)Z.close()}async openWhenSlotted(J){if(await Promise.all([...this.children].map((Z)=>Z.updateComplete).filter((Z)=>Z instanceof Promise)),this.open&&!J.open&&this.isConnected)J.showModal()}refuse(){let J=this.dialog;if(!J)return;J.removeAttribute("data-refused"),J.offsetWidth,J.setAttribute("data-refused",""),J.addEventListener("animationend",()=>J.removeAttribute("data-refused"),{once:!0})}render(){return F`<dialog
      part="dialog"
      closedby=${this.closedBy??z}
      aria-label=${this.label||"Dialog"}
      @cancel=${this.handleCancel}
      @click=${this.handleBackdrop}
      @close=${this.handleClose}
    >
      <slot name="icon"></slot>
      <slot name="header"></slot>
      <slot></slot>
      <slot name="footer"></slot>
    </dialog>`}};i6([q()],y7.prototype,"label",void 0);i6([q({reflect:!0,type:Boolean})],y7.prototype,"persistent",void 0);i6([q({attribute:"closedby",reflect:!0})],y7.prototype,"closedBy",void 0);y7=i6([G("helix-headless-dialog")],y7);var r8=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},jz=(W)=>{let J=W.toLowerCase().split("+");return{alt:J.includes("alt"),key:J.at(-1)??"",mod:J.includes("mod"),shift:J.includes("shift")}},y1=class W extends g(A){constructor(){super(...arguments);this.label="Commands",this.placeholder="Search commands",this.emptyText="No commands",this.hotkey="mod+k",this.footed=!1,this.handleHotkey=(J)=>{if(this.hotkey==="")return;let Z=jz(this.hotkey),K=J.metaKey||J.ctrlKey;if(J.key.toLowerCase()!==Z.key||K!==Z.mod||J.shiftKey!==Z.shift||J.altKey!==Z.alt)return;J.preventDefault(),this.requestOpen(!this.open)},this.handleChange=(J)=>{J.stopPropagation();let{value:Z}=J.detail;if(!this.dispatchEvent(new m({value:Z})))return;this.requestOpen(!1)},this.handleAlternate=(J)=>{if(!(J.metaKey||J.ctrlKey)||!this.open)return;if(J instanceof KeyboardEvent&&J.key!=="Enter")return;let Z=J instanceof KeyboardEvent?this.activeOption:J.target?.closest?.("[data-active], helix-option, helix-headless-option"),K=Z?.alternate;if(Z===null||Z===void 0||!K)return;if(J.preventDefault(),J.stopImmediatePropagation(),this.dispatchEvent(new m({alternate:!0,value:K})))this.requestOpen(!1)},this.swallowOptionSelect=(J)=>{if(J.target!==this)J.stopImmediatePropagation()}}get listbox(){return this.renderRoot?.querySelector('[part="listbox"]')??null}get activeOption(){return this.querySelector("[data-active]")}connectedCallback(){super.connectedCallback(),this.addEventListener("helix-select",this.swallowOptionSelect),this.addEventListener("keydown",this.handleAlternate,{capture:!0}),this.addEventListener("click",this.handleAlternate,{capture:!0}),document.addEventListener("keydown",this.handleHotkey)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("helix-select",this.swallowOptionSelect),this.removeEventListener("keydown",this.handleAlternate,{capture:!0}),this.removeEventListener("click",this.handleAlternate,{capture:!0}),document.removeEventListener("keydown",this.handleHotkey)}updated(J){if(super.updated?.(J),!J.has("open"))return;if(this.open)this.renderRoot.querySelector('[part="listbox"]')?.renderRoot?.querySelector('[part="search-field"]')?.focus();else this.listbox?.requestFilter("")}renderDialog(){return T`<${this.tag("dialog")}
    exportparts="dialog"
      label=${this.label}
      .open=${this.open}
      @helix-before-close=${()=>{if(this.open)this.requestOpen(!1)}}
    >
      <${this.tag("listbox")}
        part="listbox"
      exportparts="empty: listbox-empty, feedback: listbox-feedback, filter-icon: listbox-filter-icon,
        filter-mark: listbox-filter-mark, hint: listbox-hint, items: listbox-items,
        label: listbox-label, loading: listbox-loading, search: listbox-search,
        search-field: listbox-search-field"
        aria-label=${this.label}
        empty-text=${this.emptyText}
        filter-label=${this.placeholder}
        filterable
        @helix-before-change=${this.handleChange}
        @change=${this.stopInner}
        @input=${this.stopInner}
      >
        <slot></slot>
      </${this.tag("listbox")}>
      <div ?hidden=${!this.footed} part="footer" slot="footer">
        <slot
          name="footer"
          @slotchange=${(J)=>{this.footed=J.target.assignedNodes().length>0}}
        ></slot>
      </div>
    </${this.tag("dialog")}>`}render(){return T`${this.renderDialog()}`}};r8([q()],y1.prototype,"label",void 0);r8([q()],y1.prototype,"placeholder",void 0);r8([q({attribute:"empty-text"})],y1.prototype,"emptyText",void 0);r8([q()],y1.prototype,"hotkey",void 0);r8([U()],y1.prototype,"footed",void 0);y1=r8([G("helix-headless-command")],y1);var aK=N(`:host {
display: contents;
}

[part="dialog"] {
background-color: var(--helix-color-surface-overlay);
border: var(--dialog-border-width, var(--helix-border-floating)) solid
var(--dialog-border-color, var(--helix-color-border));

border-radius: var(--helix-radii-sm);
box-shadow: var(--dialog-shadow, var(--helix-shadow-floating));
box-sizing: border-box;
color: var(--helix-color-foreground);
display: flex;
flex-direction: column;
gap: var(--helix-space-md);

inline-size: min(var(--dialog-inline-size, 28rem), calc(100vw - var(--helix-space-xl)));

max-block-size: calc(100dvh - var(--helix-space-xl));
overflow-y: auto;
padding: var(--dialog-inset, var(--helix-space-lg));
}

[part="dialog"]:not([open]) {
display: none;
}

:host([size="sm"]) [part="dialog"] {
--dialog-inline-size: 22rem;
}

:host([size="md"]) [part="dialog"] {
--dialog-inline-size: 28rem;
}

:host([size="lg"]) [part="dialog"] {
--dialog-inline-size: 44rem;
}

:host([size="full"]) [part="dialog"] {
--dialog-inline-size: 100vw;
}

[part="dialog"]:focus,
[part="dialog"]:focus-visible {
outline: none;
}

:host {
--_dialog-scrim: var(--helix-color-overlay);
}

[part="dialog"]::backdrop {
background-color: var(--dialog-scrim, var(--_dialog-scrim));
}

::slotted([slot="header"]) {
color: var(--helix-color-foreground);
font-family: var(--helix-font-sans);
font-size: var(--helix-text-xl);
font-weight: var(--helix-weight-semibold);
letter-spacing: var(--helix-tracking-tight);
line-height: var(--helix-leading-tight);
margin: var(--helix-space-none);
}

::slotted([slot="footer"]) {
display: flex;
gap: var(--helix-space-xs);
justify-content: flex-start;
}

[part="dialog"] {
opacity: 0;
transition:
opacity var(--helix-duration-normal) var(--helix-easing-standard),
translate var(--helix-duration-normal) var(--helix-easing-decelerate),
display var(--helix-duration-normal) allow-discrete,
overlay var(--helix-duration-normal) allow-discrete;
translate: 0 var(--dialog-rise, var(--helix-space-lg));
}

[part="dialog"][open] {
opacity: 1;
translate: 0 0;
}

@starting-style {
[part="dialog"][open] {
opacity: 0;
translate: 0 var(--dialog-rise, var(--helix-space-lg));
}
}

[part="dialog"]::backdrop {
opacity: 0;
transition:
opacity var(--helix-duration-normal) var(--helix-easing-standard),
display var(--helix-duration-normal) allow-discrete,
overlay var(--helix-duration-normal) allow-discrete;
}

[part="dialog"][open]::backdrop {
opacity: 1;
}

@starting-style {
[part="dialog"][open]::backdrop {
opacity: 0;
}
}

@media (width < 30rem) {
[part="dialog"] {

margin-block-end: var(--helix-space-none);
margin-block-start: auto;
inline-size: 100vw;
max-inline-size: 100vw;

max-block-size: calc(100dvh - var(--helix-space-3xl));

border-start-start-radius: var(--helix-radii-sm);
border-start-end-radius: var(--helix-radii-sm);
border-end-start-radius: var(--helix-radii-none);
border-end-end-radius: var(--helix-radii-none);

translate: 0 100%;
}

@starting-style {
[part="dialog"][open] {
translate: 0 100%;
}
}
}

[part="dialog"][data-refused] {
animation: helix-dialog-refuse var(--helix-duration-normal) var(--helix-easing-emphasized);
}

@keyframes helix-dialog-refuse {
50% {
scale: 1.02;
}
}

@media (prefers-reduced-motion: reduce) {
[part="dialog"],
[part="dialog"]::backdrop {
transition: none;
}

[part="dialog"][data-refused] {
animation: none;
}
}

::slotted([slot="icon"]) {
block-size: var(--dialog-icon-size, calc(var(--helix-size-icon-lg) * 2));
display: block;
inline-size: var(--dialog-icon-size, calc(var(--helix-size-icon-lg) * 2));
}

:host([align="center"]) [part="dialog"] {
text-align: center;
}

:host([align="center"]) ::slotted([slot="footer"]) {
justify-content: center;
}

:host([align="center"]) ::slotted([slot="icon"]) {
margin-inline: auto;
}

@media print {
:host {
display: none;
}
}`);var hZ=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},s6=class W extends y7{static{this.styles=aK}};hZ([q({reflect:!0})],s6.prototype,"size",void 0);hZ([q({reflect:!0})],s6.prototype,"align",void 0);s6=hZ([G("helix-dialog")],s6);var oK=N(`helix-dialog::part(dialog) {
align-self: start;
inline-size: min(var(--command-size, 40rem), calc(100vw - var(--helix-space-xl) * 2));
margin-block-start: 20vh;
padding: var(--helix-space-none);
}

:host {
--option-inset: var(--helix-space-sm);
}

[part="listbox"] {
--listbox-background-color: transparent;

border: none;
display: block;
}

helix-listbox::part(items) {

background-color: transparent;
border: none;
max-block-size: var(--command-list-size, 22rem);

padding-block: var(--helix-space-xs);
}

helix-listbox::part(search) {
border-block-end: var(--helix-border-thin) solid var(--helix-color-border);
padding: var(--option-inset);
}

helix-listbox::part(search-field) {
font-size: var(--helix-text-md);
}

:host {
--_command-row: var(--helix-space-sm);
}

:host([data-density="sm"]),
:host(:where([data-density="sm"] *)) {
--_command-row: var(--helix-space-2xs);
}

:host([data-density="lg"]),
:host(:where([data-density="lg"] *)) {
--_command-row: var(--helix-space-md);
}

:host {
--option-block-inset: var(--_command-row);
}

[part="footer"] {
align-items: center;
border-block-start: var(--helix-border-thin) solid var(--helix-color-border);
color: var(--helix-color-foreground-muted);
display: flex;
font-size: var(--helix-text-xs);
gap: var(--helix-space-sm);

padding: var(--helix-space-xs) var(--option-inset);
}

[part="footer"][hidden] {
display: none;
}

@media print {
:host {
display: none;
}
}`);var _z=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},xZ=class W extends y1{static{this.tier="helix-"}static{this.styles=oK}};xZ=_z([G("helix-command")],xZ);var{I:vz}=m2,rK=(W)=>W;var tK=()=>document.createComment(""),t8=(W,J,Z)=>{let K=W._$AA.parentNode,Q=J===void 0?W._$AB:J._$AA;if(Z===void 0){let Y=K.insertBefore(tK(),Q),X=K.insertBefore(tK(),Q);Z=new vz(Y,X,W,W.options)}else{let Y=Z._$AB.nextSibling,X=Z._$AM,$=X!==W;if($){let V;Z._$AQ?.(W),Z._$AM=W,Z._$AP!==void 0&&(V=W._$AU)!==X._$AU&&Z._$AP(V)}if(Y!==Q||$){let V=Z._$AA;for(;V!==Y;){let O=rK(V).nextSibling;rK(K).insertBefore(V,Q),V=O}}}return Z},sJ=(W,J,Z=W)=>(W._$AI(J,Z),W),kz={},eK=(W,J=kz)=>W._$AH=J,JQ=(W)=>W._$AH,a6=(W)=>{W._$AR(),W._$AA.remove()};var ZQ=(W,J,Z)=>{let K=new Map;for(let Q=J;Q<=Z;Q++)K.set(W[Q],Q);return K},YQ=xJ(class extends U7{constructor(W){if(super(W),W.type!==h8.CHILD)throw Error("repeat() can only be used in text expressions")}dt(W,J,Z){let K;Z===void 0?Z=J:J!==void 0&&(K=J);let Q=[],Y=[],X=0;for(let $ of W)Q[X]=K?K($,X):X,Y[X]=Z($,X),X++;return{values:Y,keys:Q}}render(W,J,Z){return this.dt(W,J,Z).values}update(W,[J,Z,K]){let Q=JQ(W),{values:Y,keys:X}=this.dt(J,Z,K);if(!Array.isArray(Q))return this.ut=X,Y;let $=this.ut??=[],V=[],O,B,D=0,P=Q.length-1,I=0,C=Y.length-1;for(;D<=P&&I<=C;)if(Q[D]===null)D++;else if(Q[P]===null)P--;else if($[D]===X[I])V[I]=sJ(Q[D],Y[I]),D++,I++;else if($[P]===X[C])V[C]=sJ(Q[P],Y[C]),P--,C--;else if($[D]===X[C])V[C]=sJ(Q[D],Y[C]),t8(W,V[C+1],Q[D]),D++,C--;else if($[P]===X[I])V[I]=sJ(Q[P],Y[I]),t8(W,Q[D],Q[P]),P--,I++;else if(O===void 0&&(O=ZQ(X,I,C),B=ZQ($,D,P)),O.has($[D]))if(O.has($[P])){let M=B.get(X[I]),w=M!==void 0?Q[M]:null;if(w===null){let R=t8(W,Q[D]);sJ(R,Y[I]),V[I]=R}else V[I]=sJ(w,Y[I]),t8(W,Q[D],w),Q[M]=null;I++}else a6(Q[P]),P--;else a6(Q[D]),D++;for(;I<=C;){let M=t8(W,V[C+1]);sJ(M,Y[I]),V[I++]=M}for(;D<=P;){let M=Q[D++];M!==null&&a6(M)}return this.ut=X,eK(W,V),g0}});var r=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},m7=(W,J,Z,K=String)=>W.replaceAll("{page}",K(J)).replaceAll("{pages}",K(Z)),i=class W extends A{constructor(){super(...arguments);this.pages=0,this.total=0,this.pageSize=0,this.ends=!1,this.defaultPage=1,this.siblings=1,this.boundaries=1,this.href="",this.compact=!1,this.label="Pagination",this.locale="",this.pageLabel="Page {page}",this.statusLabel="{page} of {pages}",this.previousLabel="Previous page",this.nextLabel="Next page",this.firstLabel="First page",this.lastLabel="Last page",this.gapLabel="Skip to page {page}",this.announcement="",this.announced=void 0,this.pageState=void 0,this.go=(J,Z)=>{if(!this.request(J))Z.preventDefault()}}get page(){let J=this.pageState??this.defaultPage;return Math.min(this.count,Math.max(1,Math.floor(J)||1))}set page(J){let Z=this.page;this.pageState=J,this.requestUpdate("page",Z)}get numbers(){return C7(this.locale)}get count(){if(this.pages>0)return Math.max(1,Math.floor(this.pages));if(this.total>0&&this.pageSize>0)return Math.max(1,Math.ceil(this.total/this.pageSize));return 1}get current(){return this.page}get slots(){let J=this.count,Z=this.current,K=Math.max(0,Math.floor(this.boundaries)||0),Q=Math.max(0,Math.floor(this.siblings)||0),Y=2*Q+1,X=2*K+Y+2,$=(D,P)=>Array.from({length:Math.max(0,P-D+1)},(I,C)=>D+C);if(J<=X)return $(1,J);let V=Z-Q>K+2,O=Z+Q<J-K-1,B=(D,P)=>({from:D,to:P});if(!V){let D=X-K-1;return[...$(1,D),B(D+1,J-K),...$(J-K+1,J)]}if(!O){let D=J-(X-K-2);return[...$(1,K),B(K+1,D-1),...$(D,J)]}return[...$(1,K),B(K+1,Z-Q-1),...$(Z-Q,Z+Q),B(Z+Q+1,J-K),...$(J-K+1,J)]}request(J){if(J===this.current||J<1||J>this.count)return!1;return h({apply:(Z)=>{let K=this.page;this.pageState=Z,this.requestUpdate("page",K)},event:(Z)=>new f1({value:String(Z)}),host:this,next:J})}willUpdate(J){super.willUpdate(J),L(this.internals,{label:this.label,role:"navigation"}),this.toggleState("empty",this.count<=1)}updated(J){if(super.updated(J),this.announced===void 0){this.announced=this.page;return}if(this.announced!==this.page)this.announced=this.page,this.announcement=m7(this.pageLabel,this.page,this.count,this.numbers)}renderPage(J){let Z=J===this.current,K=this.numbers(J),Q=m7(this.pageLabel,J,this.count,this.numbers);return F`<li part="item">
      ${this.href?F`<a
              part="page"
              href=${m7(this.href,J,this.count)}
              aria-current=${Z?"page":z}
              aria-label=${Q}
              @click=${(Y)=>this.go(J,Y)}
              >${K}</a
            >`:F`<button
              part="page"
              type="button"
              aria-current=${Z?"page":z}
              aria-label=${Q}
              @click=${(Y)=>this.go(J,Y)}
            >
              ${K}
            </button>`}
    </li>`}renderGap(J){let Z=Math.round((J.from+J.to)/2),K=m7(this.gapLabel,Z,this.count,this.numbers);return F`<li part="item">
      ${this.href?F`<a
              part="gap"
              href=${m7(this.href,Z,this.count)}
              aria-label=${K}
              @click=${(Q)=>this.go(Z,Q)}
              >&hellip;</a
            >`:F`<button
              part="gap"
              type="button"
              aria-label=${K}
              @click=${(Q)=>this.go(Z,Q)}
            >
              &hellip;
            </button>`}
    </li>`}step(J,Z,K,Q){return{address:Z?z:m7(this.href,J,this.count),click:(Y)=>this.go(J,Y),glyph:F`<svg part="mark" fill="currentColor" viewBox=${K.viewBox} aria-hidden="true">
        ${S(K.content)}
      </svg>`,name:Q,off:Z?"true":z,spent:Z}}renderFirst(){let{address:J,click:Z,glyph:K,name:Q,off:Y,spent:X}=this.step(1,this.current<=1,O6,this.firstLabel),$=F`<slot name="first-icon">${K}</slot>`;return this.href?F`<a part="first" href=${J} aria-disabled=${Y} aria-label=${Q} @click=${Z}
          >${$}</a
        >`:F`<button part="first" type="button" ?disabled=${X} aria-label=${Q} @click=${Z}>
          ${$}
        </button>`}renderPrevious(){let{address:J,click:Z,glyph:K,name:Q,off:Y,spent:X}=this.step(this.current-1,this.current<=1,N0,this.previousLabel),$=F`<slot name="previous-icon">${K}</slot>`;return this.href?F`<a
          part="previous"
          href=${J}
          aria-disabled=${Y}
          aria-label=${Q}
          @click=${Z}
          >${$}</a
        >`:F`<button
          part="previous"
          type="button"
          ?disabled=${X}
          aria-label=${Q}
          @click=${Z}
        >
          ${$}
        </button>`}renderNext(){let{address:J,click:Z,glyph:K,name:Q,off:Y,spent:X}=this.step(this.current+1,this.current>=this.count,O0,this.nextLabel),$=F`<slot name="next-icon">${K}</slot>`;return this.href?F`<a part="next" href=${J} aria-disabled=${Y} aria-label=${Q} @click=${Z}
          >${$}</a
        >`:F`<button part="next" type="button" ?disabled=${X} aria-label=${Q} @click=${Z}>
          ${$}
        </button>`}renderLast(){let{address:J,click:Z,glyph:K,name:Q,off:Y,spent:X}=this.step(this.count,this.current>=this.count,B6,this.lastLabel),$=F`<slot name="last-icon">${K}</slot>`;return this.href?F`<a part="last" href=${J} aria-disabled=${Y} aria-label=${Q} @click=${Z}
          >${$}</a
        >`:F`<button part="last" type="button" ?disabled=${X} aria-label=${Q} @click=${Z}>
          ${$}
        </button>`}render(){if(this.compact)return F`${this.ends?this.renderFirst():z}${this.renderPrevious()}
        <span part="status"
          >${m7(this.statusLabel,this.current,this.count,this.numbers)}</span
        >
        ${this.renderNext()}${this.ends?this.renderLast():z}${this.renderLive()}`;return F`${this.ends?this.renderFirst():z}${this.renderPrevious()}
      <ol part="list" role="list">
        ${this.slots.map((J)=>typeof J==="number"?this.renderPage(J):this.renderGap(J))}
      </ol>
      ${this.renderNext()}${this.ends?this.renderLast():z}${this.renderLive()}`}renderLive(){return F`<span part="live" role="status" aria-live="polite">${this.announcement}</span>`}};r([q({type:Number})],i.prototype,"pages",void 0);r([q({type:Number})],i.prototype,"total",void 0);r([q({attribute:"page-size",type:Number})],i.prototype,"pageSize",void 0);r([q({type:Boolean})],i.prototype,"ends",void 0);r([q({type:Number})],i.prototype,"page",null);r([q({attribute:"default-page",type:Number})],i.prototype,"defaultPage",void 0);r([q({type:Number})],i.prototype,"siblings",void 0);r([q({type:Number})],i.prototype,"boundaries",void 0);r([q()],i.prototype,"href",void 0);r([q({type:Boolean})],i.prototype,"compact",void 0);r([q()],i.prototype,"label",void 0);r([q()],i.prototype,"locale",void 0);r([q({attribute:"page-label"})],i.prototype,"pageLabel",void 0);r([q({attribute:"status-label"})],i.prototype,"statusLabel",void 0);r([q({attribute:"previous-label"})],i.prototype,"previousLabel",void 0);r([q({attribute:"next-label"})],i.prototype,"nextLabel",void 0);r([q({attribute:"first-label"})],i.prototype,"firstLabel",void 0);r([q({attribute:"last-label"})],i.prototype,"lastLabel",void 0);r([q({attribute:"gap-label"})],i.prototype,"gapLabel",void 0);r([U()],i.prototype,"announcement",void 0);i=r([G("helix-headless-pagination")],i);var p7=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},m1=class W extends g(u(k(E))){constructor(){super(...arguments);this.filterable=!1,this.loading=!1,this.loadingText="Loading",this.emptyText="No matches",this.multiple=!1,this.placeholder="Choose",this.panel=new d(this,{anchor:()=>this.renderRoot?.querySelector('[part="trigger"]'),boundary:()=>[this.renderRoot?.querySelector('[part="surface"]'),this.renderRoot?.querySelector('[part="trigger"]')],offset:()=>4,onDismiss:()=>this.close(),placement:"bottom-start",surface:()=>this.renderRoot?.querySelector('[part="surface"]')}),this.handleChange=(J)=>{let Z=J.detail.value;if(!this.requestValue(Z)){J.stopPropagation();return}if(!this.multiple)this.close();J.stopPropagation()},this.handleTriggerKeydown=(J)=>{if(J.key==="ArrowDown"||J.key==="Enter"||J.key===" ")J.preventDefault(),this.requestOpen(!0)}}get selectedIndex(){return this.listbox?.selectedIndex??-1}set selectedIndex(J){let Z=this.listbox;if(Z)Z.selectedIndex=J}get type(){return this.multiple?"select-multiple":"select-one"}get listbox(){return this.renderRoot?.querySelector('[part="listbox"]')??null}get display(){let J=new Set(this.value===""?[]:this.value.split(",")),Z=(this.listbox?.options??[]).filter((K)=>J.has(K.value)).map((K)=>K.text);return Z.length>0?Z.join(", "):this.placeholder}close(){if(!this.open)return;this.requestOpen(!1),this.renderRoot.querySelector('[part="trigger"]')?.focus()}sync(){this.internals.setFormValue(this.value===""?null:this.value),this.reportRequired(this.value==="","Choose one to continue.","trigger")}willUpdate(J){super.willUpdate(J),L(this.internals,{label:this.label})}updated(J){if(super.updated(J),this.sync(),this.linkHost(),this.open){if(this.panel.show(),J.has("open"))this.listbox?.focus()}else this.panel.hide(),this.listbox?.requestFilter("")}renderListbox(){return T`<${this.tag("listbox")}
      empty-text=${this.emptyText}
      loading-text=${this.loadingText}
      ?loading=${this.loading}
      part="listbox"
      exportparts="empty: listbox-empty, feedback: listbox-feedback, filter-icon: listbox-filter-icon,
        filter-mark: listbox-filter-mark, hint: listbox-hint, items: listbox-items,
        label: listbox-label, loading: listbox-loading, search: listbox-search,
        search-field: listbox-search-field"
      .value=${this.value}
      ?multiple=${this.multiple}
      ?filterable=${this.filterable}
      aria-label=${this.label||z}
      @helix-before-change=${this.handleChange}
      @change=${this.stopInner}
      @input=${this.stopInner}
    >
      <!-- The trigger's words are read off the options, and on the first
           render there are none: the slot has not been assigned yet, so a
           select with a value came up showing its placeholder. Assignment
           changes no property, so nothing else would schedule the update
           that fixes it. -->
      <slot @slotchange=${()=>this.requestUpdate()}></slot>
    </${this.tag("listbox")}>`}renderIndicator(){return T`<slot name="indicator">
      <svg part="indicator" fill="currentColor" viewBox=${_0.viewBox} aria-hidden="true">
        ${S(_0.content)}
      </svg>
    </slot>`}render(){return T`${this.renderLabel()}
      <button
        part="trigger"
        id="control"
        type="button"
        aria-haspopup="listbox"
        aria-expanded=${this.open?"true":"false"}
        aria-describedby=${this.describedBy??z}
        ?disabled=${this.isDisabled}
        @click=${()=>this.toggleOpen()}
        @keydown=${this.handleTriggerKeydown}
      >
        <slot name="start"></slot>
        <span part="value">${this.display}</span>
        ${""}
        <slot name="end"></slot>
        ${""}
        ${this.renderIndicator()}
      </button>

      <div part="surface" popover="manual" ?hidden=${!this.open}>
        ${this.renderListbox()}
      </div>
      ${this.renderHint()}${this.renderFeedback()}`}};p7([q({reflect:!0,type:Boolean})],m1.prototype,"filterable",void 0);p7([q({reflect:!0,type:Boolean})],m1.prototype,"loading",void 0);p7([q({attribute:"loading-text"})],m1.prototype,"loadingText",void 0);p7([q({attribute:"empty-text"})],m1.prototype,"emptyText",void 0);p7([q({reflect:!0,type:Boolean})],m1.prototype,"multiple",void 0);p7([q()],m1.prototype,"placeholder",void 0);m1=p7([G("helix-headless-select")],m1);var e8=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},XJ=class W extends A{constructor(){super(...arguments);this.sizes="10,25,50,100",this.defaultValue=0,this.label="Per page",this.locale="",this.valueState=void 0,this.handleChange=(J)=>{J.stopPropagation();let Z=Number.parseInt(J.detail?.value??"",10);if(!Number.isFinite(Z)||Z===this.current)return;h({apply:(K)=>{let Q=this.value;this.valueState=K,this.requestUpdate("value",Q)},event:(K)=>new t0({value:String(K)}),host:this,next:Z}),this.updateComplete.then(()=>{let K=this.renderRoot?.querySelector('[part="control"]');if(K&&K.value!==String(this.current))K.value=String(this.current)})}}get value(){return this.valueState??this.defaultValue}set value(J){let Z=this.value;this.valueState=J,this.requestUpdate("value",Z)}get numbers(){return C7(this.locale)}get options(){return this.sizes.split(",").map((J)=>Number.parseInt(J.trim(),10)).filter((J)=>Number.isFinite(J)&&J>0)}get current(){let J=this.options;return J.includes(this.value)?this.value:J[0]??0}willUpdate(J){super.willUpdate(J),this.toggleState("empty",this.options.length===0)}renderSelect(){let J=this.tag("select"),Z=this.tag("option");return T`<${J}
      part="control"
      exportparts="label, trigger, value"
      label=${this.label}
      .value=${String(this.current)}
      @helix-before-change=${this.handleChange}
    >
      ${this.options.map((K)=>T`<${Z} value=${String(K)}>${this.numbers(K)}</${Z}>`)}
    </${J}>`}render(){if(this.options.length===0)return z;return T`${this.renderSelect()}`}};e8([q()],XJ.prototype,"sizes",void 0);e8([q({type:Number})],XJ.prototype,"value",null);e8([q({attribute:"default-value",type:Number})],XJ.prototype,"defaultValue",void 0);e8([q()],XJ.prototype,"label",void 0);e8([q()],XJ.prototype,"locale",void 0);XJ=e8([G("helix-headless-pagination-size")],XJ);var J5=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},$J=class W extends A{constructor(){super(...arguments);this.page=1,this.pageSize=0,this.total=0,this.format="{from}-{to} of {total}",this.locale=""}get numbers(){return C7(this.locale)}render(){if(this.total<=0||this.pageSize<=0)return F``;let J=Math.max(1,Math.floor(this.pageSize)),Z=Math.max(1,Math.ceil(this.total/J)),Q=(Math.min(Z,Math.max(1,Math.floor(this.page)||1))-1)*J+1,Y=Math.min(this.total,Q+J-1);return F`${this.format.replaceAll("{from}",this.numbers(Q)).replaceAll("{to}",this.numbers(Y)).replaceAll("{total}",this.numbers(this.total))}`}};J5([q({type:Number})],$J.prototype,"page",void 0);J5([q({attribute:"page-size",type:Number})],$J.prototype,"pageSize",void 0);J5([q({type:Number})],$J.prototype,"total",void 0);J5([q()],$J.prototype,"format",void 0);J5([q()],$J.prototype,"locale",void 0);$J=J5([G("helix-headless-pagination-summary")],$J);var o6=(W)=>{let J=W.trim();if(J==="")return;let[Z="",K="asc"]=J.split(":");if(Z===""||K!=="asc"&&K!=="desc")return;return{direction:K,field:Z}},mZ=(W)=>W?`${W.field}:${W.direction}`:"",pZ=(W,J)=>{if(W?.field!==J)return{direction:"asc",field:J};return W.direction==="asc"?{direction:"desc",field:J}:void 0},WQ=(W,J,Z)=>{let K=J.trim().toLocaleLowerCase();if(K==="")return[...W];return W.filter((Q)=>Z.some((Y)=>yZ(Y.order(Q)).toLocaleLowerCase().includes(K)))},KQ=(W,J,Z)=>{let K=J?Z.find((Y)=>Y.field===J.field):void 0;if(!J||!K)return[...W];let Q=J.direction==="asc"?1:-1;return[...W].sort((Y,X)=>Hz(K.order(Y),K.order(X),Q))},QQ=(W,J,Z)=>{if(Z<=0)return[...W];let K=Math.max(1,Math.ceil(W.length/Z)),Y=(Math.min(K,Math.max(1,Math.floor(J)||1))-1)*Z;return W.slice(Y,Y+Z)},yZ=(W)=>{if(W===null||W===void 0)return"";if(W instanceof Date)return W.toISOString();return String(W)},Hz=(W,J,Z)=>{let K=W===null||W===void 0||W==="",Q=J===null||J===void 0||J==="";if(K||Q)return K&&Q?0:K?1:-1;if(typeof W==="number"&&typeof J==="number")return Z*(W-J);if(typeof W==="boolean"&&typeof J==="boolean")return Z*(Number(W)-Number(J));if(W instanceof Date&&J instanceof Date)return Z*(W.getTime()-J.getTime());return Z*yZ(W).localeCompare(yZ(J),void 0,{numeric:!0,sensitivity:"base"})},gZ=(W,J,{page:Z,query:K,size:Q,spec:Y})=>{let X=WQ(W,K,J),$=KQ(X,o6(Y),J);return{matched:X.length,rows:QQ($,Z,Q),total:W.length}};var e=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},s=class W extends z0(A){constructor(){super(...arguments);this.rows=[],this.key="",this.mode="client",this.total=0,this.label="",this.defaultSort="",this.defaultFilter="",this.defaultPage=1,this.defaultPageSize=0,this.sortState=void 0,this.filterState=void 0,this.pageState=void 0,this.pageSizeState=void 0,this.paginatedState=void 0,this.handleSlotChange=()=>{this.requestUpdate()},this.handleHeadClick=(J)=>{let Z=this.columnFrom(J);if(Z?.canSort)this.toggleSort(Z.field)},this.handleHeadKey=(J)=>{if(J.key!=="Enter"&&J.key!==" ")return;let Z=this.columnFrom(J);if(Z?.canSort)J.preventDefault(),this.toggleSort(Z.field)},this.handleNavigate=(J)=>{J.stopPropagation();let Z=Number(J.detail.value);if(!Number.isFinite(Z)||!this.requestPage(Z))J.preventDefault()}}static{this.shadowRootOptions={...A.shadowRootOptions,slotAssignment:"manual"}}get sort(){return this.sortState??this.defaultSort}set sort(J){let Z=this.sort;this.sortState=J,this.requestUpdate("sort",Z)}get filter(){return this.filterState??this.defaultFilter}set filter(J){let Z=this.filter;this.filterState=J,this.requestUpdate("filter",Z)}get page(){let J=this.pageState??this.defaultPage;return Math.min(this.pages,Math.max(1,Math.floor(J)||1))}set page(J){let Z=this.page;this.pageState=J,this.requestUpdate("page",Z)}get pageSize(){return Math.max(0,Math.floor(this.pageSizeState??this.defaultPageSize)||0)}set pageSize(J){let Z=this.pageSize;this.pageSizeState=J,this.requestUpdate("pageSize",Z)}get paginated(){return this.paginatedState??this.pageSize>0}set paginated(J){let Z=this.paginated;this.paginatedState=J,this.requestUpdate("paginated",Z)}get tableColumns(){return[...this.children??[]].filter((J)=>("isTableColumn"in J)&&J.isTableColumn===!0)}get axes(){return this.tableColumns.filter((J)=>J.field!=="").map((J)=>({field:J.field,order:(Z)=>J.order(Z)}))}get template(){let J=this.tableColumns;return J.length>0?J.map((Z)=>Z.track).join(" "):""}get view(){if(this.mode==="server"){let J=Math.max(this.total,this.rows.length);return{matched:J,rows:[...this.rows],total:J}}return gZ(this.rows,this.axes,{page:this.page,query:this.filter,size:this.pageSize,spec:this.sort})}get pages(){let J=this.pageSize;if(J<=0)return 1;let Z=this.mode==="server"?Math.max(this.total,this.rows.length):this.matched;return Math.max(1,Math.ceil(Z/J))}get matched(){let J=this.filter.trim();if(J==="")return this.rows.length;let Z=this.axes,K=J.toLocaleLowerCase();return this.rows.filter((Q)=>Z.some((Y)=>{let X=Y.order(Q);return X===null||X===void 0?!1:String(X).toLocaleLowerCase().includes(K)})).length}get hasRows(){return this.view.rows.length>0}requestSort(J){return h({apply:(Z)=>{let K=this.sort;this.sortState=Z,this.requestUpdate("sort",K)},event:(Z)=>new M8({value:Z}),host:this,next:J})}requestFilter(J){return h({apply:(Z)=>{let K=this.filter;this.filterState=Z,this.requestUpdate("filter",K)},event:(Z)=>new _J({value:Z}),host:this,next:J})}requestPage(J){if(J===this.page||J<1||J>this.pages)return!1;return h({apply:(Z)=>{let K=this.page;this.pageState=Z,this.requestUpdate("page",K)},event:(Z)=>new f1({value:String(Z)}),host:this,next:J})}search(J){return this.requestFilter(J)}toggleSort(J){return this.requestSort(mZ(pZ(o6(this.sort),J)))}assign(){let J=this.renderRoot;if(!J?.querySelector)return;let Z=J.querySelector('slot[name="columns"]');if(!Z?.assign)return;let K=this.tableColumns;Z.assign(...K);let Q=[...this.children].filter((Y)=>!K.includes(Y));for(let[Y,X]of[["toolbar",!0],["footer",!0]]){let $=J.querySelector(`slot[name="${Y}"]`);if($?.assign&&X)$.assign(...Q.filter((V)=>V.getAttribute("slot")===Y))}}willUpdate(J){super.willUpdate(J),L(this.internals,{label:this.label||"Table",role:"grid"})}markEmpty(){this.markRegion("toolbar",["toolbar"]),this.markRegion("footer",["footer"],'[part="pagination"]')}markRegion(J,Z,K){let Q=this.renderRoot?.querySelector(`[part="${J}"]`),Y=!Z.some((X)=>o(this.renderRoot?.querySelector(`slot[name="${X}"]`)))&&!(K&&this.renderRoot?.querySelector(K));Q?.toggleAttribute("data-empty",Y),Q?.toggleAttribute("hidden",Y)}updated(J){super.updated(J),this.markEmpty(),this.assign()}renderCell(J,Z){return T`<span
      part="cell"
      role="gridcell"
      style=${J.align?`text-align: ${J.align}`:z}
      >${J.read(Z)}</span
    >`}renderRows(J){let Z=this.tableColumns,K=this.key;return T`${YQ(J,(Q,Y)=>K?String(Q[K]??Y):Y,(Q,Y)=>T`<div
        part="row"
        role="row"
        aria-rowindex=${this.rowIndex(Y)}
      >
        ${Z.map((X)=>this.renderCell(X,Q))}
      </div>`)}`}rowIndex(J){let Z=this.pageSize;return(Z>0?(this.page-1)*Z:0)+J+2}render(){let{matched:J,rows:Z}=this.view,K=this.template,Q=this.tableColumns,Y=this.tag("pagination");return T`<div part="toolbar"><slot name="toolbar"></slot></div>
      <div
        part="table"
        role="rowgroup"
        aria-busy=${this.loading?"true":z}
        aria-rowcount=${this.mode==="server"?Math.max(this.total,Z.length)+1:J+1}
        aria-colcount=${Q.length||z}
        style=${K?`--data-table-template: ${K}`:z}
      >
        <div part="head" role="row">
          <slot name="columns" @slotchange=${this.handleSlotChange}></slot>
        </div>
        ${this.renderRows(Z)} ${this.renderStatus(Z.length>0)}
      </div>
      <div part="footer">
        <slot name="footer"></slot>
        ${this.paginated?T`<${Y}
              part="pagination"
              page=${this.page}
              page-size=${this.pageSize||1}
              total=${J}
              @helix-navigate=${this.handleNavigate}
            ></${Y}>`:z}
      </div>`}connectedCallback(){super.connectedCallback(),this.addEventListener("click",this.handleHeadClick),this.addEventListener("keydown",this.handleHeadKey)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("click",this.handleHeadClick),this.removeEventListener("keydown",this.handleHeadKey)}columnFrom(J){let Z=this.tableColumns;for(let K of J.composedPath())if(Z.includes(K))return K;return}};e([q({attribute:!1})],s.prototype,"rows",void 0);e([q()],s.prototype,"key",void 0);e([q()],s.prototype,"mode",void 0);e([q({type:Number})],s.prototype,"total",void 0);e([q()],s.prototype,"label",void 0);e([q()],s.prototype,"sort",null);e([q({attribute:"default-sort"})],s.prototype,"defaultSort",void 0);e([q()],s.prototype,"filter",null);e([q({attribute:"default-filter"})],s.prototype,"defaultFilter",void 0);e([q({type:Number})],s.prototype,"page",null);e([q({attribute:"default-page",type:Number})],s.prototype,"defaultPage",void 0);e([q({attribute:"page-size",type:Number})],s.prototype,"pageSize",null);e([q({attribute:"default-page-size",type:Number})],s.prototype,"defaultPageSize",void 0);e([q({type:Boolean})],s.prototype,"paginated",null);e([U()],s.prototype,"sortState",void 0);e([U()],s.prototype,"filterState",void 0);e([U()],s.prototype,"pageState",void 0);e([U()],s.prototype,"pageSizeState",void 0);e([U()],s.prototype,"paginatedState",void 0);s=e([G("helix-headless-data-table")],s);var XQ=N(`:host {
display: block;
}

[part="table"] {
display: grid;

grid-template-columns: var(--data-table-columns, var(--data-table-template, minmax(0, 1fr)));
inline-size: 100%;
overflow-x: auto;
}

[part="head"],
[part="row"] {
display: contents;
}

[part="cell"] {
border-block-end: var(--helix-border-thin) solid var(--data-table-rule, var(--helix-color-border));
color: var(--data-table-color, var(--helix-color-foreground));
font-family: var(--helix-font-sans);
font-size: var(--data-table-text, var(--helix-text-sm));
padding-block: var(--data-table-padding-block, var(--helix-space-sm));
padding-inline: var(--data-table-padding-inline, var(--helix-space-sm));
}

::slotted(helix-table-column) {
border-block-end: var(--helix-border-thin) solid var(--data-table-rule, var(--helix-color-border));
color: var(--data-table-heading-color, var(--helix-color-foreground-subtle));
font-family: var(--helix-font-sans);
font-size: var(--data-table-text, var(--helix-text-sm));
font-weight: var(--helix-weight-medium);
padding-block: var(--data-table-padding-block, var(--helix-space-sm));
padding-inline: var(--data-table-padding-inline, var(--helix-space-sm));
text-align: start;
}

::slotted(helix-table-column[sortable]) {
cursor: pointer;
}

::slotted(helix-table-column[sortable]:focus-visible) {
outline: var(--helix-size-focus-ring) solid var(--helix-color-focus-ring);
outline-offset: var(--helix-size-focus-offset);
}

[part="toolbar"][data-empty],
[part="footer"][data-empty] {
display: none;
}

[part="toolbar"] {
padding-block-end: var(--helix-space-sm);
}

[part="footer"] {
padding-block-start: var(--helix-space-sm);
}

[part="empty"],
[part="loading"] {
color: var(--helix-color-foreground-subtle);
font-family: var(--helix-font-sans);
font-size: var(--helix-text-sm);
grid-column: 1 / -1;
margin: var(--helix-space-none);
padding-block: var(--helix-space-md);
padding-inline: var(--helix-space-sm);
text-align: center;
}

:host([loading]) [part="table"] {
opacity: 0.5;
}

@media print {
:host {
background-color: transparent;
box-shadow: none;
}

[part="table"] {
overflow-x: visible;
}

[part="footer"] {
display: none;
}
}`);var $Q=N(`:host {
align-items: center;
display: flex;
flex-wrap: wrap;
font-size: var(--helix-text-sm);
gap: var(--pagination-gap, var(--helix-space-2xs));
}

[part="list"] {
align-items: center;
display: flex;
flex-wrap: wrap;
gap: var(--pagination-gap, var(--helix-space-2xs));

list-style: none;
margin: var(--helix-space-none);
padding: var(--helix-space-none);
}

[part="item"] {
display: inline-flex;
}

[part="first"],
[part="gap"],
[part="last"],
[part="page"],
[part="previous"],
[part="next"] {
align-items: center;
appearance: none;
background-color: transparent;
block-size: var(--pagination-size, var(--helix-size-control-sm));
border: var(--helix-border-thin) solid transparent;
border-radius: var(--helix-radii-sm);
color: var(--helix-color-foreground-muted);
cursor: pointer;
display: inline-flex;
font: inherit;
font-variant-numeric: tabular-nums;
font-weight: var(--helix-weight-medium);
justify-content: center;
min-inline-size: var(--pagination-size, var(--helix-size-control-sm));
padding-inline: var(--helix-space-2xs);
text-decoration: none;
transition:
background-color var(--helix-duration-fast) var(--helix-easing-standard),
color var(--helix-duration-fast) var(--helix-easing-standard);
}

[part="first"]:hover,
[part="gap"]:hover,
[part="last"]:hover,
[part="page"]:hover,
[part="previous"]:hover,
[part="next"]:hover {
background-color: var(--pagination-hover-color, var(--helix-color-surface-sunken));
color: var(--helix-color-foreground);
}

[part="first"]:focus-visible,
[part="gap"]:focus-visible,
[part="last"]:focus-visible,
[part="page"]:focus-visible,
[part="previous"]:focus-visible,
[part="next"]:focus-visible {
outline: var(--helix-size-focus-ring) solid var(--helix-color-focus-ring);
outline-offset: var(--helix-size-focus-offset);
}

[part="page"][aria-current="page"],
[part="page"][aria-current="page"]:hover {
background-color: var(--pagination-current-color, var(--helix-color-surface-raised));
border-color: var(--helix-color-border);
color: var(--helix-color-foreground);
font-weight: var(--helix-weight-semibold);
}

[part="first"]:disabled,
[part="last"]:disabled,
[part="previous"]:disabled,
[part="next"]:disabled,
[part="first"][aria-disabled="true"],
[part="last"][aria-disabled="true"],
[part="previous"][aria-disabled="true"],
[part="next"][aria-disabled="true"] {
color: var(--helix-color-foreground-subtle);
cursor: default;
opacity: 0.5;
pointer-events: none;
}

[part="first"] svg,
[part="last"] svg,
[part="previous"] svg,
[part="next"] svg,
::slotted([slot="first-icon"]),
::slotted([slot="last-icon"]),
::slotted([slot="previous-icon"]),
::slotted([slot="next-icon"]) {
block-size: var(--helix-size-icon-sm);
inline-size: var(--helix-size-icon-sm);
}

:host(:dir(rtl)) [part="first"] svg,
:host(:dir(rtl)) [part="last"] svg,
:host(:dir(rtl)) [part="previous"] svg,
:host(:dir(rtl)) [part="next"] svg,
:host(:dir(rtl)) ::slotted([slot="first-icon"]),
:host(:dir(rtl)) ::slotted([slot="last-icon"]),
:host(:dir(rtl)) ::slotted([slot="previous-icon"]),
:host(:dir(rtl)) ::slotted([slot="next-icon"]) {
scale: -1 1;
}

[part="gap"] {
color: var(--helix-color-foreground-subtle);
user-select: none;
}

:host(:state(empty)) {
display: none;
}

[part="live"] {
block-size: 1px;
clip-path: inset(50%);
inline-size: 1px;
overflow: hidden;
position: absolute;
white-space: nowrap;
}

[part="status"] {
color: var(--helix-color-foreground-muted);
font-variant-numeric: tabular-nums;
font-weight: var(--helix-weight-medium);
padding-inline: var(--helix-space-xs);
}

@media (prefers-reduced-motion: reduce) {
[part="first"],
[part="gap"],
[part="last"],
[part="page"],
[part="previous"],
[part="next"] {
transition: none;
}
}

@media print {
:host {
display: none;
}
}`);var uz=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},qQ=class W extends i{static{this.styles=$Q}};qQ=uz([G("helix-pagination")],qQ);var GQ=N(`:host {
display: block;
}

:host(:not(:first-of-type)) {
margin-block-start: var(--helix-space-xs);
}

:host([hidden]) {
display: none;
}

[part="label"] {
color: var(--helix-color-foreground-subtle);
display: block;
font-family: var(--helix-font-sans);
font-size: var(--helix-text-xs);
font-weight: var(--helix-weight-medium);
padding-block: var(--helix-space-2xs);

padding-inline: var(--option-inset, var(--helix-space-xs));
}`);var hz=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},zQ=class W extends x7{static{this.styles=GQ}};zQ=hz([G("helix-option-group")],zQ);var VQ=N(`:host {

--_option-check: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 256 256'%3E%3Cpath d='M104 192a8 8 0 0 1-5.7-2.3l-56-56a8 8 0 0 1 11.4-11.4L104 172.7 210.3 66.3a8 8 0 0 1 11.4 11.4l-112 112A8 8 0 0 1 104 192Z'/%3E%3C/svg%3E");
display: block;
}

:host([hidden]) {
display: none;
}

[part="item"] {
align-items: center;

border-radius: var(--option-radii, var(--helix-radii-sm));
color: var(--helix-color-foreground);
cursor: pointer;
display: flex;
font-family: var(--helix-font-sans);
font-size: var(--helix-text-sm);
gap: var(--helix-space-xs);

min-block-size: var(--helix-size-control-sm);
box-sizing: border-box;

padding-block: var(--option-block-inset, var(--helix-space-2xs));

padding-inline: var(--option-inset, var(--helix-space-xs));

user-select: none;
}

[part="text"] {
display: flex;
flex: 1 1 auto;
flex-direction: column;
min-inline-size: 0;
}

[part="description"] {
color: var(--helix-color-foreground-muted);
font-size: var(--helix-text-xs);
line-height: var(--helix-leading-tight);
overflow: hidden;
text-overflow: ellipsis;
white-space: nowrap;
}

[part="label"] {
min-inline-size: 0;

overflow: hidden;
text-overflow: ellipsis;
white-space: nowrap;
}

:host(:state(selected)) [part="item"]::after {
content: "";
background-color: currentColor;
block-size: var(--helix-size-icon-sm);
flex: 0 0 auto;
inline-size: var(--helix-size-icon-sm);
margin-inline-start: auto;
mask-image: var(--_option-check);
mask-position: center;
mask-repeat: no-repeat;
mask-size: contain;
}

:host([data-active]) [part="item"],
:host(:not([disabled])) [part="item"]:hover {

background-color: var(
--option-active-color,
light-dark(
color-mix(in oklab, var(--helix-color-foreground) 8%, transparent),
color-mix(in oklab, var(--helix-color-foreground) 12%, transparent)
)
);
}

:host([disabled]) [part="item"] {
cursor: default;
opacity: 0.5;
}

@media print {
:host {
box-shadow: none;
print-color-adjust: exact;
}
}`);var xz=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},FQ=class W extends u0{static{this.styles=VQ}};FQ=xz([G("helix-option")],FQ);var NQ=N(`:host {
display: flex;
flex-direction: column;
gap: var(--helix-space-2xs);
position: relative;
}

[part="trigger"] {
all: unset;
align-items: center;
background-color: var(--helix-color-well);
block-size: var(--helix-size-control);
border: var(--helix-border-thin) solid var(--helix-color-border);
border-radius: var(--helix-radii-sm);
box-sizing: border-box;
color: var(--helix-color-foreground);
cursor: pointer;
display: flex;
font-family: var(--helix-font-sans);
font-size: var(--helix-text-sm);
gap: var(--helix-space-xs);
justify-content: space-between;
padding-inline: var(--helix-space-xs);
transition: border-color var(--helix-duration-fast) var(--helix-easing-standard);
}

:host(:not(:disabled)) [part="trigger"]:hover {
border-color: var(--helix-color-primary);
}

[part="trigger"]:focus-visible {
border-color: var(--helix-color-primary);
outline: var(--helix-size-focus-ring) solid var(--helix-color-focus-ring);
outline-offset: 0;
}

:host(:state(invalid)) [part="trigger"],
:host(:state(invalid)) [part="trigger"]:hover,
:host(:state(invalid)) [part="trigger"]:focus-visible {
border-color: var(--helix-color-danger);
outline-color: var(--helix-color-danger);
}

:host(:disabled) [part="trigger"] {
cursor: not-allowed;
opacity: 0.5;
}

:host([emphasis="ghost"]) {
inline-size: fit-content;
}

:host([emphasis="ghost"]) [part="trigger"] {
background-color: transparent;
block-size: var(--helix-size-control-sm);
border-color: transparent;
justify-content: start;
padding-inline: var(--helix-space-2xs);
}

:host([emphasis="ghost"]:not(:disabled)) [part="trigger"]:hover {
background-color: color-mix(in oklab, var(--helix-color-foreground) 8%, transparent);
border-color: transparent;
}

:host([emphasis="ghost"]) [part="trigger"]:focus-visible {
border-color: var(--helix-color-primary);
}

[part="value"] {
flex: 1;
overflow: hidden;
text-overflow: ellipsis;
white-space: nowrap;
}

[part="surface"] {

--option-radii: var(--helix-radii-none);

background-color: var(--helix-color-surface-overlay);

border-radius: var(--helix-radii-md);
box-shadow: var(--select-shadow, var(--helix-shadow-floating));

inline-size: var(--floating-anchor-width, 100%);
min-inline-size: max-content;

max-block-size: var(--floating-available-height, none);

padding-block: var(--helix-space-xs);
padding-inline: var(--helix-space-none);

border: var(--select-border-width, var(--helix-border-floating)) solid
var(--select-border-color, var(--helix-color-border));
inset: auto;
margin: var(--helix-space-none);
}

[part="surface"] {
opacity: 0;
--_travel: calc(var(--helix-space-2xs) * -1);
transform: translateY(var(--_travel));

scale: 0.96;

transition:
opacity var(--helix-duration-fast) var(--helix-easing-standard),
scale var(--helix-duration-fast) var(--helix-easing-emphasized),
transform var(--helix-duration-fast) var(--helix-easing-emphasized),
display var(--helix-duration-fast) allow-discrete,
overlay var(--helix-duration-fast) allow-discrete;
}

[part="surface"][data-placement^="top"] {
--_travel: var(--helix-space-2xs);
}

[part="surface"][data-placed] {
opacity: 1;
scale: 1;
transform: none;
}

[part="surface"][data-placement^="top"] {
transform-origin: var(--floating-arrow-x, 50%) 100%;
}

[part="surface"][data-placement^="bottom"] {
transform-origin: var(--floating-arrow-x, 50%) 0;
}

@media (prefers-reduced-motion: reduce) {
[part="surface"],
[part="surface"][data-placed] {
scale: 1;
transform: none;
transition: none;
}
}

[part="indicator"],
::slotted([slot="indicator"]) {
transition: scale var(--helix-duration-fast) var(--helix-easing-standard);
}

:host(:state(open)) [part="indicator"],
:host(:state(open)) ::slotted([slot="indicator"]) {
scale: 1 -1;
}

@media (prefers-reduced-motion: reduce) {
[part="indicator"],
::slotted([slot="indicator"]) {
transition: none;
}
}

[part="surface"][hidden],
[part="surface"]:not(:popover-open) {
display: none;
}

[part="listbox"]::part(items) {
background-color: transparent;
border: none;

border-radius: var(--helix-radii-none);
max-block-size: var(--select-surface-max-block-size, 14rem);
padding: var(--helix-space-none);
}

[part="listbox"]::part(items):focus-visible {
outline: none;
}

@media (prefers-reduced-motion: reduce) {
[part="trigger"] {
transition: none;
}
}

[part="indicator"] {
block-size: var(--helix-size-icon-sm);
color: var(--helix-color-foreground-muted);
flex: 0 0 auto;
inline-size: var(--helix-size-icon-sm);
}

@media print {
:host {
box-shadow: none;
print-color-adjust: exact;
}
}`);var OQ=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},nZ=class W extends m1{static{this.tier="helix-"}static{this.styles=[y,l,NQ]}};OQ([q({reflect:!0})],nZ.prototype,"emphasis",void 0);nZ=OQ([G("helix-select")],nZ);var BQ=N(`:host {
display: inline-flex;
}

:host(:state(empty)) {
display: none;
}

[part="control"] {
align-items: center;
flex-direction: row;
gap: var(--helix-space-xs);
}

[part="control"]::part(label) {
padding-block-end: var(--helix-space-none);
white-space: nowrap;
}

[part="control"]::part(trigger) {
block-size: var(--helix-size-control-sm);
}`);var yz=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},AQ=class W extends XJ{static{this.tier="helix-"}static{this.styles=BQ}};AQ=yz([G("helix-pagination-size")],AQ);var DQ=N(`:host {
color: var(--helix-color-foreground-subtle);
display: inline-block;
font-family: var(--helix-font-sans);
font-size: var(--helix-text-sm);
font-variant-numeric: tabular-nums;
}`);var mz=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},PQ=class W extends $J{static{this.styles=DQ}};PQ=mz([G("helix-pagination-summary")],PQ);var IQ=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},O9=class W extends A{constructor(){super(...arguments);this.header=!1}willUpdate(J){super.willUpdate(J),L(this.internals,{role:this.header?"columnheader":"cell"})}render(){return F`<slot></slot>`}};IQ([q({reflect:!0,type:Boolean})],O9.prototype,"header",void 0);O9=IQ([G("helix-headless-table-cell")],O9);var g7=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},TQ=(W,J)=>{if(J==="")return;if(!J.includes("."))return W[J];let Z=W;for(let K of J.split(".")){if(Z===null||typeof Z!=="object")return;Z=Z[K]}return Z},p1=class W extends A{constructor(){super(...arguments);this.width="",this.field="",this.sortable=!1,this.align="",this.cell=void 0,this.compare=void 0,this.isTableColumn=!0}get track(){return this.width||"minmax(max-content, 1fr)"}get canSort(){return this.sortable&&this.field!==""}read(J){let Z=this.cell?.(J);return Z===void 0?TQ(J,this.field):Z}order(J){let Z=this.compare?.(J);return Z===void 0?TQ(J,this.field):Z}willUpdate(J){super.willUpdate(J),L(this.internals,{role:"columnheader"})}render(){return F`<span part="column"><slot></slot></span>`}};g7([q()],p1.prototype,"width",void 0);g7([q()],p1.prototype,"field",void 0);g7([q({type:Boolean})],p1.prototype,"sortable",void 0);g7([q()],p1.prototype,"align",void 0);g7([q({attribute:!1})],p1.prototype,"cell",void 0);g7([q({attribute:!1})],p1.prototype,"compare",void 0);p1=g7([G("helix-headless-table-column")],p1);var lZ=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},Z5=class W extends z0(A){constructor(){super(...arguments);this.columns="",this.label="",this.handleSlotChange=()=>{this.requestUpdate()}}get tableColumns(){return[...this.children??[]].filter((J)=>("isTableColumn"in J)&&J.isTableColumn===!0)}get template(){let J=this.tableColumns;if(J.length>0)return J.map((Z)=>Z.track).join(" ");return this.columns}static{this.shadowRootOptions={...A.shadowRootOptions,slotAssignment:"manual"}}assign(){let J=this.renderRoot?.querySelector('slot[name="columns"]'),Z=this.renderRoot?.querySelector("slot:not([name])");if(!J||!Z)return;let K=new Set(this.tableColumns);J.assign(...this.tableColumns),Z.assign(...[...this.children].filter((Q)=>!K.has(Q)))}updated(J){super.updated(J),this.assign()}render(){let J=this.template;return F`<div
      part="table"
      role="table"
      aria-busy=${this.loading?"true":z}
      aria-label=${this.label||"Table"}
      style=${J?`--table-template: ${J}`:""}
    >
      <div part="head" role="row"><slot name="columns"></slot></div>
      <slot
        @slotchange=${(Z)=>{this.countRows(Z),this.handleSlotChange()}}
      ></slot>
      ${this.renderStatus(this.hasRows)}
    </div>`}};lZ([q()],Z5.prototype,"columns",void 0);lZ([q()],Z5.prototype,"label",void 0);Z5=lZ([G("helix-headless-table")],Z5);var pz=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},r6=class W extends A{willUpdate(J){super.willUpdate(J),L(this.internals,{role:"row"})}render(){return F`<slot></slot>`}};r6=pz([G("helix-headless-table-row")],r6);var UQ=N(`:host {

align-items: center;
border-block-end: var(--helix-border-thin) solid var(--helix-color-border);
box-sizing: border-box;

color: var(--helix-color-foreground);
display: flex;
font-size: var(--helix-text-sm);
min-block-size: var(--helix-size-control-md);
min-inline-size: 0;

overflow-wrap: anywhere;
padding: var(--helix-space-xs) var(--helix-space-md) var(--helix-space-xs) var(--helix-space-none);
}

::slotted(*) {
min-inline-size: 0;
}

:host([header]) {
font-weight: var(--helix-weight-medium);
}`);var gz=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},CQ=class W extends O9{static{this.styles=UQ}};CQ=gz([G("helix-table-cell")],CQ);var LQ=N(`:host {
display: contents;
}

[part="column"] {
align-items: center;
border-block-end: var(--helix-border-thin) solid var(--helix-color-border);
box-sizing: border-box;

color: var(--helix-color-foreground-muted);
display: flex;
font-family: var(--helix-font-sans);
font-size: var(--helix-text-sm);
font-weight: var(--helix-weight-semibold);

min-block-size: var(--helix-size-control-lg);
min-inline-size: 0;
padding-inline-end: var(--helix-space-md);
}`);var nz=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},MQ=class W extends p1{static{this.styles=LQ}};MQ=nz([G("helix-table-column")],MQ);var SQ=N(`:host {
display: block;
overflow-x: auto;
}

[part="table"] {
display: grid;

grid-template-columns: var(--table-columns, var(--table-template, minmax(0, 1fr)));
inline-size: 100%;
}

[part="head"] {
display: contents;
}

[part="empty"],
[part="loading"] {
color: var(--helix-color-foreground-subtle);
font-family: var(--helix-font-sans);
font-size: var(--helix-text-sm);
margin: var(--helix-space-none);
padding-block: var(--helix-space-md);
padding-inline: var(--helix-space-sm);
text-align: center;
}

:host([loading]) [part="table"] {
opacity: 0.5;
}

@media print {
:host {
background-color: transparent;
box-shadow: none;
}
}`);var lz=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},RQ=class W extends Z5{static{this.styles=SQ}};RQ=lz([G("helix-table")],RQ);var EQ=N(`:host {
display: contents;
}`);var cz=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},wQ=class W extends r6{static{this.styles=EQ}};wQ=cz([G("helix-table-row")],wQ);var dz=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},cZ=class W extends s{static{this.tier="helix-"}static{this.styles=XQ}};cZ=dz([G("helix-data-table")],cZ);var Y0=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},iz=new Set(["ArrowDown","ArrowLeft","ArrowRight","ArrowUp","End","Enter","Home","PageDown","PageUp"," "]),dZ=(W)=>{let J=/^(\d{4})-(\d{2})-(\d{2})$/.exec(W);if(!J)return null;let Z=new Date(Date.UTC(Number(J[1]),Number(J[2])-1,Number(J[3])));return Number.isNaN(Z.getTime())?null:Z},Y5=(W)=>W.toISOString().slice(0,10),sz=()=>{let W=new Date,J=`${W.getMonth()+1}`.padStart(2,"0"),Z=`${W.getDate()}`.padStart(2,"0");return`${W.getFullYear()}-${J}-${Z}`},iZ=(W)=>W.split(",").map((J)=>J.trim()).filter(Boolean),aJ=(W,J)=>new Date(Date.UTC(W.getUTCFullYear(),W.getUTCMonth(),W.getUTCDate()+J)),bQ=(W,J)=>W.getUTCFullYear()===J.getUTCFullYear()&&W.getUTCMonth()===J.getUTCMonth(),t6=(W,J)=>{let Z=new Date(Date.UTC(W.getUTCFullYear(),W.getUTCMonth()+J,1)),K=new Date(Date.UTC(Z.getUTCFullYear(),Z.getUTCMonth()+1,0)).getUTCDate();return new Date(Date.UTC(Z.getUTCFullYear(),Z.getUTCMonth(),Math.min(W.getUTCDate(),K)))},a=class W extends u(E){constructor(){super(...arguments);this.months=1,this.locale="",this.disableDates="",this.disableDays="",this.invalid=!1,this.previousLabel="Previous month",this.nextLabel="Next month",this.defaultMonth="",this.monthState=void 0,this.min="",this.step=1,this.max="",this.label="Date Picker",this.firstDayOfWeek=0,this.focused="",this.handleKeydown=(J)=>{if(!iz.has(J.key)||this.disabled)return;let Z=J.composedPath(),K=this.renderRoot?.querySelector('[part="grid"]');if(!K||!Z.includes(K))return;let Q=this.anchor;if(J.key==="Enter"||J.key===" ")this.select(Q);else if(J.key==="ArrowLeft")this.moveTo(aJ(Q,-1));else if(J.key==="ArrowRight")this.moveTo(aJ(Q,1));else if(J.key==="ArrowUp")this.moveTo(aJ(Q,-7));else if(J.key==="ArrowDown")this.moveTo(aJ(Q,7));else if(J.key==="Home")this.moveTo(aJ(Q,-((Q.getUTCDay()-this.firstDayOfWeek+7)%7)));else if(J.key==="End")this.moveTo(aJ(Q,6-(Q.getUTCDay()-this.firstDayOfWeek+7)%7));else{let Y=J.key==="PageUp"?-1:1;this.moveTo(t6(Q,J.shiftKey?Y*12:Y))}J.preventDefault()},this.readOnly=!1,this.required=!1}get month(){return this.monthState??(this.defaultMonth||Y5(this.derivedMonth).slice(0,7))}set month(J){let Z=this.month;this.monthState=J,this.requestUpdate("month",Z)}get selected(){return iZ(this.value)}get range(){let J=this.selected;if(this.mode!=="range"||J.length<2)return null;let[Z,K]=[J[0],J[1]];return Z<=K?[Z,K]:[K,Z]}isSelected(J){let Z=this.range;if(Z)return J>=Z[0]&&J<=Z[1];return this.selected.includes(J)}get shown(){let J=/^(\d{4})-(\d{2})$/.exec(this.monthState??this.defaultMonth);if(J)return new Date(Date.UTC(Number(J[1]),Number(J[2])-1,1));return this.derivedMonth}get derivedMonth(){let J=dZ(this.selected[0]??"")??new Date;return new Date(Date.UTC(J.getUTCFullYear(),J.getUTCMonth(),1))}get anchor(){let J=this.shown;for(let Z of[dZ(this.focused),dZ(this.selected[0]??"")])if(Z&&bQ(Z,J))return Z;return J}weeksOf(J){let Z=(J.getUTCDay()-this.firstDayOfWeek+7)%7,K=aJ(J,-Z);return Array.from({length:6},(Q,Y)=>Array.from({length:7},(X,$)=>aJ(K,Y*7+$)))}barred(J){let Z=Y5(J);if(this.min!==""&&Z<this.min)return!0;if(this.max!==""&&Z>this.max)return!0;if(iZ(this.disableDays).includes(String(J.getUTCDay())))return!0;let K=Math.max(1,Math.floor(this.step)||1);if(K>1){let Q=this.min===""?0:pJ(this.min)?.getTime()??0;if(Math.round((J.getTime()-Q)/86400000)%K!==0)return!0}return iZ(this.disableDates).includes(Z)}show(J){if(this.disabled)return;let Z=`${J.getUTCFullYear()}-${String(J.getUTCMonth()+1).padStart(2,"0")}`;if(Z===this.month)return;h({apply:(K)=>{let Q=this.month;this.monthState=K,this.requestUpdate("month",Q)},event:(K)=>new f1({value:K}),host:this,next:Z})}moveTo(J){this.focused=Y5(J),this.show(J),this.updateComplete.then(()=>{this.renderRoot.querySelector('[part="cell"][tabindex="0"]')?.focus()})}select(J){if(this.disabled)return;if(this.barred(J))return;let Z=Y5(J),K=this.selected,Q;if(this.mode==="range")Q=K.length===1?[...K,Z].sort():[Z];else if(this.mode==="multiple")Q=K.includes(Z)?K.filter((Y)=>Y!==Z):[...K,Z].sort();else Q=[Z];this.focused=Z,this.requestValue(Q.join(","))}connectedCallback(){super.connectedCallback(),this.addEventListener("keydown",this.handleKeydown)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("keydown",this.handleKeydown)}requestValue(J){if(this.readOnly)return!1;return super.requestValue(J)}reportRequired(){if(this.required&&this.value==="")this.internals.setValidity({valueMissing:!0},"Choose a date.",this.renderRoot?.querySelector('[part="grid"]')??void 0);else this.internals.setValidity({})}willUpdate(J){super.willUpdate(J),L(this.internals,{label:this.label,role:"group"}),this.internals.ariaDisabled=this.isDisabled?"true":null,this.internals.ariaInvalid=this.invalid?"true":null,this.report()}updated(J){super.updated(J),this.reportRequired()}report(){let J=this.selected;if(this.name===""||this.disabled||J.length===0){this.internals.setFormValue(null);return}let Z=new FormData;for(let K of J)Z.append(this.name,K);this.internals.setFormValue(Z)}get monthCount(){return Math.max(1,Math.floor(this.months)||1)}get formats(){if(this.cachedFormats?.locale===this.locale)return this.cachedFormats;let J=this.locale||void 0,Z={full:new Intl.DateTimeFormat(J,{dateStyle:"full",timeZone:"UTC"}),heading:new Intl.DateTimeFormat(J,{month:"long",timeZone:"UTC",year:"numeric"}),locale:this.locale,weekday:new Intl.DateTimeFormat(J,{timeZone:"UTC",weekday:"short"})};return this.cachedFormats=Z,Z}renderPreviousMark(){return F`<slot name="previous-icon">
      <svg part="previous-mark" fill="currentColor" viewBox=${N0.viewBox} aria-hidden="true">
        ${S(N0.content)}
      </svg>
    </slot>`}renderNextMark(){return F`<slot name="next-icon">
      <svg part="next-mark" fill="currentColor" viewBox=${O0.viewBox} aria-hidden="true">
        ${S(O0.content)}
      </svg>
    </slot>`}renderMonth(J,Z){let{full:K,heading:Q,weekday:Y}=this.formats,X=this.weeksOf(J),$=Y5(this.anchor),V=sz(),O=this.range,B=Z===0,D=Z===this.monthCount-1;return F`<div part="month">
      <div part="header">
        ${B?F`<button
                part="previous"
                type="button"
                aria-label=${this.previousLabel}
                @click=${()=>this.show(t6(this.shown,-1))}
              >
                ${this.renderPreviousMark()}
              </button>`:z}
        <span part="heading">${Q.format(J)}</span>
        ${D?F`<button
                part="next"
                type="button"
                aria-label=${this.nextLabel}
                @click=${()=>this.show(t6(this.shown,1))}
              >
                ${this.renderNextMark()}
              </button>`:z}
      </div>
      <div
        part="grid"
        role="grid"
        aria-label=${Q.format(J)}
        data-unset=${this.value===""?"":z}
      >
        <div part="week" role="row">
          ${X[0]?.map((P)=>F`<span part="weekday" role="columnheader">${Y.format(P)}</span>`)}
        </div>
        ${X.map((P)=>F`<div part="week" role="row">
            ${P.map((I)=>{let C=Y5(I),M=this.barred(I),w=this.isSelected(C),R=!bQ(I,J);return F`<span
                part="cell"
                role="gridcell"
                aria-disabled=${M?"true":z}
                aria-label=${K.format(I)}
                aria-current=${C===V?"date":z}
                aria-selected=${!R&&w?"true":z}
                data-outside=${R?"":z}
                data-range-end=${!R&&O&&C===O[1]?"":z}
                data-range-middle=${!R&&O&&C>O[0]&&C<O[1]?"":z}
                data-range-start=${!R&&O&&C===O[0]?"":z}
                data-today=${C===V?"":z}
                tabindex=${!R&&C===$?"0":"-1"}
                @click=${R?z:()=>this.select(I)}
                ><span part="day">${I.getUTCDate()}</span></span
              >`})}
          </div>`)}
      </div>
    </div>`}render(){let J=this.shown,Z=this.monthCount;return F`<div part="months" style="--date-picker-column-count: ${Math.min(Z,2)}">
      ${Array.from({length:Z},(K,Q)=>this.renderMonth(t6(J,Q),Q))}
    </div>`}get valueAsDate(){return pJ(this.value)}set valueAsDate(J){this.value=b7(J)}get valueAsNumber(){return pJ(this.value)?.getTime()??Number.NaN}set valueAsNumber(J){this.value=Number.isNaN(J)?"":b7(new Date(J))}};Y0([q({reflect:!0})],a.prototype,"mode",void 0);Y0([q({type:Number})],a.prototype,"months",void 0);Y0([q()],a.prototype,"locale",void 0);Y0([q({attribute:"disable-dates"})],a.prototype,"disableDates",void 0);Y0([q({attribute:"disable-days"})],a.prototype,"disableDays",void 0);Y0([q({reflect:!0,type:Boolean})],a.prototype,"invalid",void 0);Y0([q()],a.prototype,"month",null);Y0([q({attribute:"previous-label"})],a.prototype,"previousLabel",void 0);Y0([q({attribute:"next-label"})],a.prototype,"nextLabel",void 0);Y0([q({attribute:"default-month"})],a.prototype,"defaultMonth",void 0);Y0([q()],a.prototype,"min",void 0);Y0([q({type:Number})],a.prototype,"step",void 0);Y0([q()],a.prototype,"max",void 0);Y0([q()],a.prototype,"label",void 0);Y0([q({attribute:"first-day-of-week",type:Number})],a.prototype,"firstDayOfWeek",void 0);Y0([U()],a.prototype,"focused",void 0);Y0([q({attribute:"read-only",reflect:!0,type:Boolean})],a.prototype,"readOnly",void 0);Y0([q({reflect:!0,type:Boolean})],a.prototype,"required",void 0);a=Y0([G("helix-headless-date-picker")],a);var $0=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},B9=(W)=>/^\d{4}-\d{2}-\d{2}$/.test(W),qJ=(W)=>W.replace(/\s+[–-]\s+/g,",").split(",").map((J)=>J.trim()).filter(Boolean),t=class W extends g(u(k(E))){constructor(){super(...arguments);this.autocomplete="",this.months=1,this.maxTags=0,this.min="",this.step=1,this.max="",this.disableDates="",this.disableDays="",this.firstDayOfWeek=0,this.dateStyle="long",this.locale="",this.placeholder="YYYY-MM-DD",this.triggerLabel="Choose a date",this.panel=new d(this,{anchor:()=>this.renderRoot?.querySelector('[part="field"]'),boundary:()=>[this.renderRoot?.querySelector('[part="surface"]'),this.renderRoot?.querySelector('[part="trigger"]')],offset:()=>8,onDismiss:()=>this.requestOpen(!1),placement:"bottom-start",surface:()=>this.renderRoot?.querySelector('[part="surface"]')}),this.editing=!1,this.draft="",this.handleInput=(J)=>{J.stopPropagation(),this.editing=!0;let Z=J.target.value;if(this.mode==="multiple"){this.draft=Z;return}let K=qJ(Z),Q=K.length>0&&K.every(B9);this.requestValue(Q?K.join(","):Z),this.restore()},this.handleDraftKey=(J)=>{if(this.mode!=="multiple")return;let Z=qJ(this.value);if(J.key==="Enter"&&B9(this.draft)){if(J.preventDefault(),!Z.includes(this.draft))this.requestValue([...Z,this.draft].join(","));this.draft=""}else if(J.key==="Backspace"&&this.draft===""&&Z.length>0)this.requestValue(Z.slice(0,-1).join(","))},this.removeDate=(J)=>{this.requestValue(qJ(this.value).filter((Z)=>Z!==J).join(","))},this.handleCalendarChange=(J)=>{J.stopPropagation();let{value:Z}=J.detail;if(this.requestValue(Z),this.restore(),this.mode===void 0)this.requestOpen(!1),this.updateComplete.then(()=>this.returnFocus())},this.handleKeydown=(J)=>{if(J.key==="Escape"&&this.open)J.stopPropagation(),this.requestOpen(!1),this.returnFocus()},this.readOnly=!1,this.returning=!1,this.handleBlur=()=>{this.editing=!1},this.handleFocus=(J)=>{this.editing=!this.returning;let Z=J.relatedTarget;if(this.open||this.isDisabled||this.returning)return;if(Z instanceof Node&&this.renderRoot?.contains?.(Z))return;this.requestOpen(!0)}}get control(){if(typeof this.renderRoot?.querySelector!=="function")return null;return this.renderRoot.querySelector('[part="control"]')}get picked(){let J=qJ(this.value);return J.length>0&&J.every(B9)?J.join(","):""}written(J){if(this.dateStyle==="iso"||!B9(J))return J;let Z=new Date(`${J}T00:00:00Z`);return Number.isNaN(Z.getTime())?J:new Intl.DateTimeFormat(this.locale||void 0,{dateStyle:this.dateStyle,timeZone:"UTC"}).format(Z)}get display(){if(this.mode==="multiple")return this.draft;let J=qJ(this.value);if(this.editing||this.dateStyle==="iso")return this.mode==="range"&&J.length===2?J.join(" – "):this.value;let Z=J.map((K)=>this.written(K));return this.mode==="range"?Z.join(" – "):Z.join(", ")}get shownDates(){let J=qJ(this.value);return this.maxTags>0?J.slice(0,this.maxTags):J}get restCount(){return Math.max(0,qJ(this.value).length-this.shownDates.length)}restore(){let J=this.control;if(J&&J.value!==this.display)J.value=this.display;this.sync()}sync(){this.internals.setFormValue(this.value);let J=this.control;if(!J)return;let Z=qJ(this.value),K="";if(Z.length>0&&!Z.every(B9))K=this.mode===void 0?"Enter a date as YYYY-MM-DD.":"Enter dates as YYYY-MM-DD, separated by commas.";else if(this.min!==""&&Z.some((Q)=>Q<this.min))K=`Choose a date on or after ${this.min}.`;else if(this.max!==""&&Z.some((Q)=>Q>this.max))K=`Choose a date on or before ${this.max}.`;else if(this.mode==="range"&&Z.length>2)K="A range is two dates.";if(K==="")this.internals.setValidity(J.validity,J.validationMessage,J);else this.internals.setValidity({badInput:!0},K,J);this.refreshFeedback()}requestValue(J){if(this.readOnly)return!1;return super.requestValue(J)}firstUpdated(J){super.firstUpdated(J),this.sync()}updated(J){if(super.updated(J),J.has("value"))this.sync();if(this.open){if(this.panel.show(),J.has("open"))this.renderRoot?.querySelector('[part="picker"]')?.focus()}else this.panel.hide()}returnFocus(){this.returning=!0,this.control?.focus(),this.returning=!1}focus(J){this.control?.focus(J)}renderPicker(){return T`<${this.tag("date-picker")}
      part="picker"
      exportparts="cell: picker-cell, day: picker-day, grid: picker-grid, header: picker-header,
        heading: picker-heading, month: picker-month, months: picker-months, next: picker-next,
        next-mark: picker-next-mark, previous: picker-previous, previous-mark: picker-previous-mark,
        week: picker-week, weekday: picker-weekday"
      ?invalid=${this.resolvedFeedback!==""}
      mode=${this.mode??z}
      months=${this.months}
      .value=${this.picked}
      disable-dates=${this.disableDates||z}
      disable-days=${this.disableDays||z}
      first-day-of-week=${this.firstDayOfWeek}
      locale=${this.locale||z}
      max=${this.max||z}
      min=${this.min||z}
      step=${this.step}
      @helix-before-change=${this.handleCalendarChange}
      @change=${this.stopInner}
      @input=${this.stopInner}
    ></${this.tag("date-picker")}>`}renderTag(J){return T`<${this.tag("tag")}
                  part="date"
      exportparts="dismiss: date-dismiss, dismiss-mark: date-dismiss-mark, prefix: date-prefix"
                  dismissible
                  dismiss-label=${`Remove ${J}`}
                  ?disabled=${this.isDisabled}
                  @helix-dismiss=${(Z)=>{Z.stopPropagation(),this.removeDate(J)}}
                  >${this.written(J)}</${this.tag("tag")}
                >`}renderTrigger(){return T`<slot name="trigger"><svg aria-hidden="true" fill="currentColor" part="trigger-icon" viewBox=${n5.viewBox}>
        ${S(n5.content)}
      </svg></slot>`}render(){return T`${this.renderLabel()}
      <div part="field" @keydown=${this.handleKeydown}>
        ${this.mode==="multiple"?this.shownDates.map((J)=>this.renderTag(J)):z}
        ${this.restCount>0?T`<span part="rest">${`+${this.restCount}`}</span>`:z}
        <input
          part="control"
          id="control"
          type="text"
          .value=${this.display}
          name=${this.name||z}
          placeholder=${this.mode==="multiple"&&qJ(this.value).length>0?z:this.placeholder||z}
          autocomplete=${this.autocomplete||z}
          inputmode="numeric"
          aria-describedby=${this.describedBy??z}
          ?disabled=${this.isDisabled}
          ?readonly=${this.readOnly}
          ?required=${this.required}
          @blur=${this.handleBlur}
          @focus=${this.handleFocus}
          @input=${this.handleInput}
          @keydown=${this.handleDraftKey}
        />
        <button
          part="trigger"
          type="button"
          aria-controls="surface"
          aria-expanded=${this.open?"true":"false"}
          aria-haspopup="dialog"
          aria-label=${this.triggerLabel}
          ?disabled=${this.isDisabled}
          @click=${()=>this.toggleOpen()}
        >
          ${this.renderTrigger()}
        </button>
      </div>

      <div part="surface" id="surface" popover="manual" ?hidden=${!this.open}>
        ${this.renderPicker()}
      </div>
      ${this.renderHint()}${this.renderFeedback()}`}get valueAsDate(){return pJ(this.value)}set valueAsDate(J){this.value=b7(J)}get valueAsNumber(){return pJ(this.value)?.getTime()??Number.NaN}set valueAsNumber(J){this.value=Number.isNaN(J)?"":b7(new Date(J))}};$0([q()],t.prototype,"autocomplete",void 0);$0([q({reflect:!0})],t.prototype,"mode",void 0);$0([q({type:Number})],t.prototype,"months",void 0);$0([q({attribute:"max-tags",type:Number})],t.prototype,"maxTags",void 0);$0([q()],t.prototype,"min",void 0);$0([q({type:Number})],t.prototype,"step",void 0);$0([q()],t.prototype,"max",void 0);$0([q({attribute:"disable-dates"})],t.prototype,"disableDates",void 0);$0([q({attribute:"disable-days"})],t.prototype,"disableDays",void 0);$0([q({attribute:"first-day-of-week",type:Number})],t.prototype,"firstDayOfWeek",void 0);$0([q({attribute:"date-style"})],t.prototype,"dateStyle",void 0);$0([q()],t.prototype,"locale",void 0);$0([q()],t.prototype,"placeholder",void 0);$0([q({attribute:"trigger-label"})],t.prototype,"triggerLabel",void 0);$0([U()],t.prototype,"editing",void 0);$0([U()],t.prototype,"draft",void 0);$0([q({attribute:"read-only",reflect:!0,type:Boolean})],t.prototype,"readOnly",void 0);t=$0([G("helix-headless-date-input")],t);var fQ=N(`:host {
display: inline-block;

--_calendar-track: var(--date-picker-track-size, 2.5rem);
--_calendar-row: var(--date-picker-row-size, 2.25rem);
--_calendar-day: var(--date-picker-day-size, 1.875rem);
}

[part="months"] {
align-items: start;
display: grid;
gap: var(--helix-space-md);
grid-template-columns: repeat(
var(--date-picker-columns, var(--date-picker-column-count, 1)),
max-content
);
justify-content: start;
}

[part="header"] {
align-items: center;
display: grid;
gap: var(--helix-space-2xs);
grid-template-columns: var(--_calendar-day) 1fr var(--_calendar-day);
margin-block-end: var(--helix-space-lg);
}

[part="heading"] {
font-size: var(--helix-text-sm);
font-weight: var(--helix-weight-medium);
grid-column: 2;
text-align: center;
}

[part="previous"] {
grid-column: 1;
}

[part="next"] {
grid-column: 3;
}

[part="previous"],
[part="next"] {
all: unset;

box-sizing: border-box;
align-items: center;
block-size: var(--_calendar-day);
border-radius: var(--helix-radii-sm);
color: var(--helix-color-foreground-muted);
cursor: pointer;
display: inline-flex;
inline-size: var(--_calendar-day);
justify-content: center;
}

[part="previous"]:hover,
[part="next"]:hover {
background-color: var(--helix-color-surface-sunken);
color: var(--helix-color-foreground);
}

[part="previous"] svg,
[part="next"] svg,
::slotted([slot="previous-icon"]),
::slotted([slot="next-icon"]) {
block-size: 1em;
inline-size: 1em;
}

[part="week"] {
display: grid;
grid-template-columns: repeat(7, var(--_calendar-track));
}

[part="weekday"] {
align-items: center;
block-size: var(--_calendar-track);
color: var(--helix-color-foreground-subtle);
display: inline-flex;
font-size: var(--helix-text-xs);
font-weight: var(--helix-weight-medium);
inline-size: var(--_calendar-track);
justify-content: center;
padding-block-end: calc(var(--_calendar-track) / 2);
}

[part="cell"] {
align-items: center;
block-size: var(--_calendar-row);
cursor: pointer;
display: inline-flex;
inline-size: var(--_calendar-track);
justify-content: center;
}

[part="day"] {
align-items: center;
block-size: var(--_calendar-day);

border-radius: var(--helix-radii-sm);
display: inline-flex;
font-size: var(--helix-text-sm);
inline-size: var(--_calendar-day);
justify-content: center;
transition: background-color var(--helix-duration-fast) var(--helix-easing-standard);
}

[part="cell"][data-today] [part="day"] {
box-shadow: inset 0 0 0 var(--helix-border-thin) var(--helix-color-border);
}

[part="cell"][data-outside] [part="day"] {
color: var(--helix-color-foreground-subtle);
}

[part="cell"]:hover:not([aria-disabled], [data-outside]) [part="day"] {
background-color: var(--helix-color-surface-sunken);
}

[part="cell"][aria-selected]:is([data-range-start], [data-range-middle], [data-range-end]) {
background-color: var(
--date-picker-range-color,
light-dark(
color-mix(in oklab, var(--helix-color-foreground) 10%, transparent),
color-mix(in oklab, var(--helix-color-foreground) 14%, transparent)
)
);
}

[part="cell"][aria-selected]:not([data-range-start]):not([data-range-middle]):not([data-range-end])
[part="day"] {
box-shadow: 0 0 0 calc((var(--_calendar-row) - var(--_calendar-day)) / 2)
var(
--date-picker-range-color,
light-dark(
color-mix(in oklab, var(--helix-color-foreground) 10%, transparent),
color-mix(in oklab, var(--helix-color-foreground) 14%, transparent)
)
);
}

[part="cell"][data-range-start],
[part="cell"][aria-selected]:not([data-range-middle]):not([data-range-end]) {
border-end-start-radius: var(--helix-radii-sm);
border-start-start-radius: var(--helix-radii-sm);
}

[part="cell"][data-range-end],
[part="cell"][aria-selected]:not([data-range-middle]):not([data-range-start]) {
border-end-end-radius: var(--helix-radii-sm);
border-start-end-radius: var(--helix-radii-sm);
}

[part="cell"][aria-selected]:not([data-range-middle]) [part="day"] {
background-color: var(--date-picker-selected-color, var(--helix-color-surface-inverse));
color: var(--helix-color-foreground-inverse);
}

[part="cell"][aria-disabled] {
cursor: default;
}

[part="cell"][aria-disabled] [part="day"] {
color: var(--helix-color-foreground-subtle);
opacity: 0.4;
}

[part="cell"]:focus-visible {
outline: none;
}

[part="cell"]:focus-visible [part="day"] {
outline: var(--helix-size-focus-ring) solid var(--helix-color-focus-ring);
outline-offset: var(--helix-size-focus-offset);
}

@media (prefers-reduced-motion: reduce) {
[part="day"] {
transition: none;
}
}

:host(:dir(rtl)) [part="previous"] svg,
:host(:dir(rtl)) [part="next"] svg,
:host(:dir(rtl)) ::slotted([slot="previous-icon"]),
:host(:dir(rtl)) ::slotted([slot="next-icon"]) {
scale: -1 1;
}

:host(:disabled) {
cursor: not-allowed;
opacity: 0.5;
}

:host([invalid]) [part="cell"][aria-selected] [part="day"] {
outline: var(--helix-size-focus-ring) solid var(--helix-color-danger);
outline-offset: var(--helix-size-focus-offset);
}

:host([invalid]) [part="cell"]:focus-visible [part="day"] {
outline-color: var(--helix-color-danger);
}

:host([invalid]) [part="grid"][data-unset] {
border-radius: var(--helix-radii-sm);
outline: var(--helix-size-focus-ring) solid var(--helix-color-danger);
outline-offset: var(--helix-size-focus-offset);
}

@media print {
:host {
box-shadow: none;
print-color-adjust: exact;
}
}`);var az=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},jQ=class W extends a{static{this.styles=fQ}};jQ=az([G("helix-date-picker")],jQ);var _Q=N(`[part="field"] {
align-items: center;
background-color: var(--date-input-background-color, var(--helix-color-well));
border: var(--helix-border-thin) solid var(--helix-color-border);
border-radius: var(--helix-radii-sm);
display: flex;
flex-wrap: wrap;
gap: var(--helix-space-2xs);
min-block-size: var(--helix-size-control);
padding-block: var(--helix-space-2xs);
padding-inline: var(--helix-space-xs);
transition:
background-color var(--helix-duration-fast) var(--helix-easing-standard),
border-color var(--helix-duration-fast) var(--helix-easing-standard);
}

[part="control"] {
all: unset;
box-sizing: border-box;
color: var(--helix-color-foreground);
flex: 1 1 auto;
font-family: var(--helix-font-sans);
font-size: var(--helix-text-md);
font-weight: var(--helix-weight-medium);
min-inline-size: 0;
}

:host(:not(:disabled)) [part="field"]:hover {
border-color: var(--helix-color-primary);
}

:host(:focus-within) [part="field"],
:host(:focus-within) [part="field"]:hover {
border-color: var(--helix-color-primary);
outline: var(--helix-size-focus-ring) solid var(--helix-color-focus-ring);
outline-offset: 0;
}

[part="trigger"] {
all: unset;
block-size: var(--helix-size-icon);
box-sizing: border-box;
color: var(--helix-color-foreground-muted);
cursor: pointer;
flex: none;
inline-size: var(--helix-size-icon);

mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23000' stroke-width='2' stroke-linecap='round'%3E%3Crect x='3' y='5' width='18' height='16' rx='2'/%3E%3Cpath d='M3 10h18M8 3v4M16 3v4'/%3E%3C/svg%3E");
mask-position: center;
mask-repeat: no-repeat;
mask-size: 100%;
background-color: currentColor;
transition: color var(--helix-duration-fast) var(--helix-easing-standard);
}

[part="trigger"]:hover {
color: var(--helix-color-foreground);
}

[part="trigger"]:focus-visible {
outline: var(--helix-size-focus-ring) solid var(--helix-color-focus-ring);
outline-offset: var(--helix-size-focus-offset);
}

[part="surface"] {
background-color: var(--helix-color-surface-overlay);
border: var(--date-input-border-width, var(--helix-border-floating)) solid
var(--date-input-border-color, var(--helix-color-border));
border-radius: var(--helix-radii-sm);
box-shadow: var(--date-input-shadow, var(--helix-shadow-floating));
inline-size: max-content;
inset: auto;
margin: var(--helix-space-none);
padding: var(--helix-space-sm);
position: absolute;
}

[part="surface"] {
opacity: 0;
--_travel: calc(var(--helix-space-2xs) * -1);
transform: translateY(var(--_travel));
scale: 0.96;
transition:
opacity var(--helix-duration-fast) var(--helix-easing-standard),
scale var(--helix-duration-fast) var(--helix-easing-emphasized),
transform var(--helix-duration-fast) var(--helix-easing-emphasized),
display var(--helix-duration-fast) allow-discrete,
overlay var(--helix-duration-fast) allow-discrete;
}

[part="surface"][data-placement^="top"] {
--_travel: var(--helix-space-2xs);
}

[part="surface"][data-placed] {
opacity: 1;
scale: 1;
transform: none;
}

[part="surface"][data-placement^="top"] {
transform-origin: var(--floating-arrow-x, 50%) 100%;
}

[part="surface"][data-placement^="bottom"] {
transform-origin: var(--floating-arrow-x, 50%) 0;
}

[part="surface"][hidden] {
display: none;
}

:host(:disabled) [part="field"] {
color: var(--helix-color-foreground-subtle);
}

:host(:disabled) [part="control"],
:host(:disabled) [part="trigger"] {
cursor: not-allowed;
}

@media (prefers-reduced-motion: reduce) {
[part="field"],
[part="trigger"] {
transition: none;
}

[part="surface"],
[part="surface"][data-placed] {
scale: 1;
transform: none;
transition: none;
}
}

[part="date"] {
flex: none;
}

:host([mode="multiple"]) [part="control"] {

flex-basis: 0;
min-inline-size: var(--helix-size-icon-lg);
}

[part="rest"] {
color: var(--helix-color-foreground-subtle);
flex: none;
align-self: center;

font-family: var(--helix-font-sans);
font-size: var(--helix-text-xs);
font-weight: var(--helix-weight-medium);
white-space: nowrap;
}

:host(:state(invalid)) [part="field"],
:host(:state(invalid)) [part="field"]:hover,
:host(:state(invalid):focus-within) [part="field"],
:host(:state(invalid):focus-within) [part="field"]:hover {
border-color: var(--helix-color-danger);
outline-color: var(--helix-color-danger);
}

@media print {
:host {
box-shadow: none;
print-color-adjust: exact;
}
}`);var oz=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},vQ=class W extends t{static{this.tier="helix-"}static{this.styles=[y,l,_Q]}};vQ=oz([G("helix-date-input")],vQ);var sZ=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},W5=class W extends A{constructor(){super(...arguments);this.announced=!1}markEmpty(){let J=this.renderRoot?.querySelector('[part="content"]'),Z=!o(this.renderRoot?.querySelector("slot"));J?.toggleAttribute("data-empty",Z),J?.toggleAttribute("hidden",Z)}updated(J){super.updated(J),this.markEmpty()}render(){return F`<div
      part="line"
      role=${this.announced?"separator":"presentation"}
      aria-orientation=${this.announced?this.orientation??"horizontal":z}
    ></div>
      <span part="content"><slot @slotchange=${()=>this.markEmpty()}></slot></span>
      <div part="line" role="presentation"></div>`}};sZ([q({reflect:!0})],W5.prototype,"orientation",void 0);sZ([q({reflect:!0,type:Boolean})],W5.prototype,"announced",void 0);W5=sZ([G("helix-headless-divider")],W5);var kQ=N(`:host {
align-items: center;
display: flex;

--_divider-thickness: var(--divider-thickness, var(--helix-border-thin));
}

[part="content"] {
color: var(--helix-color-foreground-muted);
margin-inline: var(--helix-space-sm);
display: inline-flex;
flex: 0 0 auto;
font-family: var(--helix-font-sans);
font-size: var(--helix-text-xs);
line-height: var(--helix-leading-tight);
}

[part="content"] slot::slotted(*),
[part="content"] {
white-space: nowrap;
}

[part="content"][data-empty] {
display: none;
}

:host {
padding-inline-end: var(--divider-inset-end, var(--divider-inset, var(--helix-space-none)));
padding-inline-start: var(--divider-inset-start, var(--divider-inset, var(--helix-space-none)));
}

:host([orientation="vertical"]) {
padding-block-end: var(--divider-inset-end, var(--divider-inset, var(--helix-space-none)));
padding-block-start: var(--divider-inset-start, var(--divider-inset, var(--helix-space-none)));
padding-inline: var(--helix-space-none);
}

:host([orientation="vertical"]) {
align-self: stretch;
display: inline-flex;
flex-direction: column;
}

:host([orientation="vertical"]) [part="content"] {
margin-block: var(--helix-space-sm);
margin-inline: var(--helix-space-none);
}

[part="line"] {
background-color: var(--divider-color, var(--helix-color-border));
}

:host(:not([orientation])) [part="line"],
:host([orientation="horizontal"]) [part="line"] {
block-size: var(--_divider-thickness);
flex: 1 1 0;
}

:host([orientation="vertical"]) {
block-size: var(--divider-length, auto);
}

:host([orientation="vertical"]) [part="line"] {
flex: 1 1 0;
inline-size: var(--_divider-thickness);

min-block-size: 1em;
}

@media print {
:host {
box-shadow: none;
}
}`);var rz=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},HQ=class W extends W5{static{this.styles=kQ}};HQ=rz([G("helix-divider")],HQ);var aZ=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},e6=100,U1=e6/2,n7=40,uQ=9999,hQ={large:8,medium:16,none:n7,small:26},K5=class W extends r1(A){connectedCallback(){super.connectedCallback(),this.pointer.axis="none"}get span(){return this.sweep==="half"?0.5:1}get thickness(){return hQ[this.hole??"medium"]??hQ.medium??0}get radius(){return n7-this.thickness/2}get shares(){let Z=(this.series[0]?.points??[]).map((Y)=>Y.value).map((Y)=>Number.isFinite(Y)&&Y>0?Y:0),K=Z.reduce((Y,X)=>Y+X,0);if(K===0)return[];let Q=0;return Z.map((Y)=>{let X=Y/K,$=Q;return Q+=X,{fraction:X,start:$}})}render(){let J=this.shares;return F`${this.renderPlot(J)}
`}renderPlot(J){return F`<div
      aria-hidden="true"
      id="helix-chart-plot"
      part="plot"
      style="--donut-chart-stroke: ${this.thickness}"
    >
      <svg viewBox=${this.frame} xmlns="http://www.w3.org/2000/svg">
        <circle
          cx=${U1}
          cy=${U1}
          fill="none"
          part="track"
          r=${this.radius}
          stroke-dasharray="${2*Math.PI*this.radius*this.span} ${uQ}"
          stroke-width=${this.thickness}
        />
        ${J.map((Z,K)=>this.renderSegment(Z,K))}
      </svg>
      ${this.hole==="none"?z:F`<div part="center"><slot></slot></div>`}
      ${this.renderTooltip()}
    </div>`}get frame(){if(this.sweep!=="half")return`0 0 ${e6} ${e6}`;return`0 ${U1-n7} ${e6} ${n7+this.thickness/2}`}renderSegment(J,Z){let K=2*Math.PI*this.radius,Q=J.fraction*K*this.span;return _`<circle
      cx=${U1}
      cy=${U1}
      data-active=${this.pointer.at===Z?"":z}
      data-series=${c(Z)}
      fill="none"
      style="--chart-series: var(--chart-series-${c(Z)})"
      @pointerenter=${()=>this.pointer.set(Z)}
      part="segment"
      r=${this.radius}
      stroke-dasharray="${Q} ${uQ}"
      stroke-dashoffset=${-J.start*K*this.span}
    />
    ${this.renderEdge(J,Z)}`}renderEdge(J,Z){let K=2*Math.PI*this.span,Q=J.start*K-Math.PI/2,Y=(J.start+J.fraction)*K-Math.PI/2,X=n7,$=n7-this.thickness,V=(w,R)=>`${(U1+Math.cos(R)*w).toFixed(3)} ${(U1+Math.sin(R)*w).toFixed(3)}`,O=Y-Q>Math.PI?1:0,B=Y-Q>=2*Math.PI-0.000001,D=Q+(Y-Q)/2,P=B?`A ${X} ${X} 0 0 1 ${V(X,D)} A ${X} ${X} 0 0 1 ${V(X,Y)}`:`A ${X} ${X} 0 ${O} 1 ${V(X,Y)}`,I=$<=0?`L ${U1} ${U1}`:B?`L ${V($,Y)} A ${$} ${$} 0 0 0 ${V($,D)} A ${$} ${$} 0 0 0 ${V($,Q)}`:`L ${V($,Y)} A ${$} ${$} 0 ${O} 0 ${V($,Q)}`,C=`M ${V(X,Q)} ${P} ${I} Z`,M=`helix-donut-edge-${Z}`;return _`<clipPath id=${M}><path d=${C} /></clipPath>
    <path
      clip-path="url(#${M})"
      d=${C}
      data-active=${this.pointer.at===Z?"":z}
      data-series=${c(Z)}
        fill="none"
      part="segment-edge"
      style="--chart-series: var(--chart-series-${c(Z)})"
    />`}renderTooltip(){let J=this.pointer.at,Z=this.shares[J];if(!Z)return e0(this.sourceRows,J,this.tag("tooltip"));let K=(Z.start+Z.fraction/2)*2*Math.PI-Math.PI/2,Q=n7,Y=U1+Math.cos(K)*Q,X=U1+Math.sin(K)*Q;return e0(this.sourceRows,J,this.tag("tooltip"),{placement:Math.abs(Math.cos(K))>Math.abs(Math.sin(K))?Math.cos(K)>0?"right":"left":Math.sin(K)>0?"bottom":"top",x:`${Y}%`,y:`${X}%`})}};aZ([q({reflect:!0})],K5.prototype,"hole",void 0);aZ([q({reflect:!0})],K5.prototype,"sweep",void 0);K5=aZ([G("helix-headless-donut-chart")],K5);var xQ=N(`:host {
display: grid;
position: relative;

inline-size: var(--donut-chart-size, 16em);
place-items: center;
}

[part="plot"] {
grid-area: 1 / 1;
}

[part="plot"] {
position: relative;

inline-size: 100%;
}

[part="plot"] svg {
aspect-ratio: 1;
display: block;
inline-size: 100%;
}

[part="track"],
[part="segment"] {
transform: rotate(-90deg);
transform-box: fill-box;
transform-origin: center;
}

[part="track"] {
stroke: var(--donut-chart-track-color, var(--helix-color-surface-sunken));
}

[part="segment"] {
stroke-linecap: butt;

stroke-width: var(--donut-chart-stroke);
}

[part="center"] slot {
--stat-value-size: 24cqi;

font-size: 13cqi;
}

[part="center"] {

inset-block-start: 50%;
inset-inline-start: 50%;
pointer-events: none;
position: absolute;
translate: -50% -50%;

box-sizing: border-box;

container-type: inline-size;
display: grid;
inline-size: calc(100% * (80 - var(--donut-chart-stroke, 16)) / 100);
place-items: center;
text-align: center;
}

[part="segment"] {
stroke: var(--chart-series);
}

[part="mark"] {
block-size: 1px;
inline-size: 1px;
pointer-events: none;
position: absolute;
}

[part="tooltip-anchor"] {
inset: 0;
pointer-events: none;
position: absolute;
}

[part="tooltip-label"] {
color: var(--helix-color-foreground-muted);
display: block;
font-weight: var(--helix-weight-medium);
}

[part="tooltip-cell"] {
align-items: baseline;
display: flex;
gap: var(--helix-space-sm);
justify-content: space-between;
}

[part="tooltip-name"] {
color: var(--helix-color-foreground-muted);
}

[part="tooltip-value"] {
font-variant-numeric: tabular-nums;
font-weight: var(--helix-weight-medium);
}

[part="tooltip-cell"][data-series]::before {
block-size: 0.5em;
border-radius: var(--helix-radii-full);
content: "";
inline-size: 0.5em;
}

[part="tooltip-cell"][data-series="1"]::before {
background-color: var(--helix-color-series-1);
}

[part="tooltip-cell"][data-series="2"]::before {
background-color: var(--helix-color-series-2);
}

[part="tooltip-cell"][data-series="3"]::before {
background-color: var(--helix-color-series-3);
}

[part="tooltip-cell"][data-series="4"]::before {
background-color: var(--helix-color-series-4);
}

[part="tooltip-cell"][data-series="5"]::before {
background-color: var(--helix-color-series-5);
}

[part="tooltip-cell"][data-series="6"]::before {
background-color: var(--helix-color-series-6);
}

[part="tooltip-cell"][data-series="7"]::before {
background-color: var(--helix-color-series-7);
}

[part="tooltip-cell"][data-series="8"]::before {
background-color: var(--helix-color-series-8);
}

[part="tooltip-cell"][data-series="9"]::before {
background-color: var(--helix-color-series-9);
}

[part="tooltip-cell"][data-series="10"]::before {
background-color: var(--helix-color-series-10);
}

[part="tooltip-cell"][data-series="11"]::before {
background-color: var(--helix-color-series-11);
}

[part="tooltip-cell"][data-series="12"]::before {
background-color: var(--helix-color-series-12);
}

[part="tooltip-cell"][data-series="13"]::before {
background-color: var(--helix-color-series-13);
}

[part="tooltip-cell"][data-series="14"]::before {
background-color: var(--helix-color-series-14);
}

[part="tooltip-cell"][data-series="15"]::before {
background-color: var(--helix-color-series-15);
}

[part="tooltip-cell"][data-series="16"]::before {
background-color: var(--helix-color-series-16);
}

[part="tooltip-cell"][data-series="17"]::before {
background-color: var(--helix-color-series-17);
}

[part="tooltip-cell"][data-series="18"]::before {
background-color: var(--helix-color-series-18);
}

[part="tooltip-cell"][data-series="19"]::before {
background-color: var(--helix-color-series-19);
}

[part="tooltip-cell"][data-series="20"]::before {
background-color: var(--helix-color-series-20);
}

[part="tooltip-cell"][data-series="21"]::before {
background-color: var(--helix-color-series-21);
}

[part="tooltip-cell"][data-series="22"]::before {
background-color: var(--helix-color-series-22);
}

[part="tooltip-cell"][data-series="23"]::before {
background-color: var(--helix-color-series-23);
}

[part="tooltip-cell"][data-series="24"]::before {
background-color: var(--helix-color-series-24);
}

[part="segment"][data-active] {
stroke-width: calc(var(--donut-chart-stroke) * 1.18);
}

:host([emphasis="outlined"]) [part="segment"][data-active] {
stroke: var(--chart-series);
stroke-width: var(--donut-chart-stroke);
}

[part="segment"] {
transition:
stroke var(--helix-duration-fast) var(--helix-easing-decelerate),
stroke-width var(--helix-duration-fast) var(--helix-easing-decelerate);
}

@media (prefers-reduced-motion: reduce) {
[part="segment"] {
transition: none;
}
}

[part="segment"] {
transition:
r var(--helix-duration-normal) var(--helix-easing-decelerate),
stroke-dasharray var(--helix-duration-normal) var(--helix-easing-decelerate),
stroke-dashoffset var(--helix-duration-normal) var(--helix-easing-decelerate),
stroke-width var(--helix-duration-fast) var(--helix-easing-decelerate);
}

@starting-style {
[part="segment"] {
stroke-dasharray: 0 9999;
}
}

[part="track"] {
transition: r var(--helix-duration-normal) var(--helix-easing-decelerate);
}

@media (prefers-reduced-motion: reduce) {
[part="segment"],
[part="track"] {
transition: none;
}
}

[part="segment"] {
cursor: crosshair;
}

:host([sweep="half"]) [part="plot"] svg {
aspect-ratio: 100 / calc(40 + var(--donut-chart-stroke, 16) / 2);
}

:host([sweep="half"]) [part="track"],
:host([sweep="half"]) [part="segment"] {
transform: rotate(180deg);
}

:host([sweep="half"]) [part="center"] {
inset-block-end: 0;
inset-block-start: auto;
translate: -50% 0;

block-size: calc(
100% *
(40 - var(--donut-chart-stroke, 16)) /
(40 + var(--donut-chart-stroke, 16) / 2)
);
}

:host([sweep="half"]) [part="center"] slot {
--stat-value-size: 12cqi;

font-size: 6.5cqi;
}

@media print {
:host {
box-shadow: none;
print-color-adjust: exact;
}
}

:host([emphasis="subtle"]) [part="segment"] {
stroke: color-mix(
in oklab,
var(--chart-series) 30%,
var(--donut-chart-track-color, var(--helix-color-surface-sunken))
);
}

[part="segment-edge"] {
fill: none;
stroke: none;
}

:host([emphasis="outlined"]) [part="segment"] {
stroke: color-mix(
in oklab,
var(--chart-series) 55%,
var(--donut-chart-track-color, var(--helix-color-surface-sunken))
);
}

:host([emphasis="outlined"]) [part="segment-edge"] {
stroke: var(--chart-series);

stroke-width: var(--donut-chart-edge-stroke, 3);
}

:host([material="glass"]) [part="segment"] {
stroke-opacity: calc(0.62 * var(--helix-material-opacity));
}

:host([material="frosted"]) [part="segment"] {
stroke-opacity: calc(0.88 * var(--helix-material-opacity));
}`);var oZ=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},J4=class W extends K5{static{this.tier="helix-"}static{this.styles=[lJ,xQ]}};oZ([q({reflect:!0})],J4.prototype,"emphasis",void 0);oZ([q({reflect:!0})],J4.prototype,"material",void 0);J4=oZ([G("helix-donut-chart")],J4);var A9=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},oJ=class W extends g(A){constructor(){super(...arguments);this.commands=new SJ(this,{commands:{"--close":()=>this.requestOpen(!1),"--show":()=>this.requestOpen(!0),"--toggle":()=>this.toggleOpen()}}),this.label="",this.modal=!0,this.returned="",this.handleCancel=(J)=>{J.preventDefault(),this.requestOpen(!1)},this.handleClose=(J)=>{if(this.open)this.requestOpen(!1);this.relayNativeEvent(J)},this.handleBackdrop=(J)=>{if(J.target===this.panel&&this.modal)this.requestOpen(!1)}}get returnValue(){return this.panel?.returnValue??this.returned}set returnValue(J){this.returned=J;let Z=this.panel;if(Z)Z.returnValue=J}get panel(){return this.renderRoot?.querySelector('[part="panel"]')??null}updated(J){super.updated(J);let Z=this.panel;if(!Z)return;if(this.open&&!Z.open)if(this.modal)Z.showModal();else Z.show();else if(!this.open&&Z.open)Z.close()}render(){return F`<dialog
      part="panel"
      closedby=${this.closedBy??z}
      aria-label=${this.label||"Drawer"}
      @cancel=${this.handleCancel}
      @click=${this.handleBackdrop}
      @close=${this.handleClose}
    >
      <div part="header"><slot name="header"></slot></div>
      <div part="content"><slot></slot></div>
    </dialog>`}};A9([q({reflect:!0})],oJ.prototype,"placement",void 0);A9([q()],oJ.prototype,"label",void 0);A9([q({converter:M7})],oJ.prototype,"modal",void 0);A9([q({attribute:"closedby",reflect:!0})],oJ.prototype,"closedBy",void 0);oJ=A9([G("helix-headless-drawer")],oJ);var yQ=N(`:host {

display: contents;

--_drawer-size: var(--drawer-size, 20rem);
}

:host {
--_drawer-scrim: var(--helix-color-overlay);
}

[part="panel"]::backdrop {
background-color: var(--drawer-scrim, var(--_drawer-scrim));
opacity: 0;
transition:
opacity var(--helix-duration-normal) var(--helix-easing-standard),
display var(--helix-duration-normal) allow-discrete,
overlay var(--helix-duration-normal) allow-discrete;
}

[part="panel"][open]::backdrop {
opacity: 1;
}

@starting-style {
[part="panel"][open]::backdrop {
opacity: 0;
}
}

[part="panel"] {

border-radius: var(--drawer-radii, var(--helix-radii-sm));

margin: var(--helix-space-none);
border: none;
max-inline-size: none;
max-block-size: none;

inset: auto;

inline-size: auto;
block-size: auto;

background-color: var(--helix-color-surface-overlay);

padding: var(--drawer-inset, var(--helix-space-lg));

padding-block-start: var(--drawer-inset-block-start, var(--drawer-inset, var(--helix-space-2xl)));
display: flex;
flex-direction: column;
outline: none;
position: fixed;

transition:
transform var(--helix-duration-normal) var(--helix-easing-decelerate),
display var(--helix-duration-normal) allow-discrete,
overlay var(--helix-duration-normal) allow-discrete;
z-index: var(--helix-layer-overlay);
}

:host([material="glass"]) [part="panel"] {
backdrop-filter: var(--drawer-backdrop, var(--helix-material-backdrop));
background-color: var(--drawer-background-color, var(--helix-material-translucent));
}

:host([material="frosted"]) [part="panel"] {
backdrop-filter: var(--drawer-backdrop, blur(var(--helix-material-blur-lg)));
background-color: var(--drawer-background-color, var(--helix-material-translucent-strong));
}

:host(:not([placement])) [part="panel"],
:host([placement="end"]) [part="panel"] {

border-start-end-radius: var(--helix-radii-none);
border-end-end-radius: var(--helix-radii-none);
block-size: 100%;
inline-size: min(var(--_drawer-size), 100%);
inset-block: 0;
inset-inline-end: 0;
transform: translateX(100%);
}

:host([placement="start"]) [part="panel"] {
border-start-start-radius: var(--helix-radii-none);
border-end-start-radius: var(--helix-radii-none);
block-size: 100%;
inline-size: min(var(--_drawer-size), 100%);
inset-block: 0;
inset-inline-start: 0;
transform: translateX(-100%);
}

:host([placement="bottom"]) [part="panel"] {
border-end-start-radius: var(--helix-radii-none);
border-end-end-radius: var(--helix-radii-none);
block-size: min(var(--_drawer-size), 100%);
inset-block-end: 0;
inset-inline: 0;
transform: translateY(100%);
}

:host([placement="top"]) [part="panel"] {
border-start-start-radius: var(--helix-radii-none);
border-start-end-radius: var(--helix-radii-none);
block-size: min(var(--_drawer-size), 100%);
inset-block-start: 0;
inset-inline: 0;
transform: translateY(-100%);
}

:host(:state(open)) [part="panel"] {
border: var(--drawer-border-width, var(--helix-border-floating)) solid
var(--drawer-border-color, var(--helix-color-border));
box-shadow: var(--drawer-shadow, var(--helix-shadow-floating));
transform: translate(0, 0);
}

[part="header"] {
flex: 0 0 auto;
}

[part="content"] {
flex: 1 1 auto;
min-block-size: 0;

margin-inline: calc(var(--helix-size-focus-reach) * -1);
overflow-y: auto;
padding-inline: var(--helix-size-focus-reach);
}

@media (prefers-reduced-motion: reduce) {
[part="panel"] {
transition: none;
}

[part="panel"]::backdrop {
transition: none;
}
}

@media print {
:host {
display: none;
}
}`);var mQ=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},rZ=class W extends oJ{static{this.styles=yQ}};mQ([q({reflect:!0})],rZ.prototype,"material",void 0);rZ=mQ([G("helix-drawer")],rZ);var Q5=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},s0=class W extends A{constructor(){super(...arguments);this.disabled=!1,this.value="",this.isDrilldownItem=!0,this.onPage=!0,this.showingPage=!1,this.focusable=!1}focusItem(){this.renderRoot.querySelector('[part="item"]')?.focus()}select(){if(this.disabled)return;this.dispatchEvent(new m({value:this.value}))}render(){if(this.showingPage)return F`<slot name="page"></slot>`;if(!this.onPage)return z;return F`<button
      part="item"
      type="button"
      role="menuitem"
      aria-disabled=${this.disabled?"true":z}
      tabindex=${this.focusable?"0":"-1"}
      @click=${()=>this.select()}
    >
      <slot name="start"></slot>
      <span part="label"><slot></slot></span>
      <slot name="end"></slot>
    </button>`}};Q5([q({reflect:!0,type:Boolean})],s0.prototype,"disabled",void 0);Q5([q()],s0.prototype,"value",void 0);Q5([q({attribute:!1})],s0.prototype,"onPage",void 0);Q5([q({attribute:!1})],s0.prototype,"showingPage",void 0);Q5([q({attribute:!1})],s0.prototype,"focusable",void 0);s0=Q5([G("helix-headless-drilldown-item")],s0);var Z4=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},l7=class W extends z0(A){constructor(){super(...arguments);this.label="Navigation",this.backLabel="Back",this.drilldown=new E8(this,{isRow:(J)=>("isDrilldownItem"in J)&&J.isDrilldownItem===!0,root:()=>[...this.children],slot:"page"}),this.handleFocusIn=(J)=>{let Z=this.drilldown.rows.find((K)=>K.contains(J.target));if(Z&&!Z.disabled)for(let K of this.drilldown.rows)K.focusable=K===Z},this.handleSelect=(J)=>{let Z=J.target;if(!(Z instanceof s0)||!this.items.includes(Z))return;if(this.drilldown.hasPage(Z))J.stopPropagation(),this.enter(Z)},this.handleKeydown=(J)=>{let Z=this.items,K=Z.findIndex((Q)=>Q.matches(":focus-within"));if(J.key==="ArrowDown"||J.key==="ArrowUp"){J.preventDefault();let Q=J.key==="ArrowDown"?1:-1,Y=(K+Q+Z.length)%Math.max(Z.length,1);Z[K===-1?0:Y]?.focusItem();return}if(J.key==="Home"||J.key==="End"){J.preventDefault(),(J.key==="Home"?Z[0]:Z[Z.length-1])?.focusItem();return}if(J.key==="ArrowLeft"||J.key==="Escape"){if(this.back())J.preventDefault(),J.stopPropagation();return}if(J.key==="ArrowRight"&&K!==-1){let Q=Z[K];if(Q&&this.drilldown.hasPage(Q))J.preventDefault(),this.enter(Q)}}}get items(){return this.drilldown.rows.filter((J)=>!J.disabled)}placeTabStop(){let J=this.items,K=J.find((Q)=>Q.focusable)??J[0];for(let Q of this.drilldown.rows)Q.focusable=Q===K}enter(J){if(!this.drilldown.enter(J))return;this.direction="forward",this.updateComplete.then(()=>this.items[0]?.focusItem())}back(){let J=this.drilldown.page;if(!this.drilldown.back())return!1;return this.direction="back",this.updateComplete.then(()=>J?.focusItem()),!0}connectedCallback(){super.connectedCallback(),this.addEventListener("helix-select",this.handleSelect,!0),this.addEventListener("keydown",this.handleKeydown),this.addEventListener("focusin",this.handleFocusIn)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("helix-select",this.handleSelect,!0),this.removeEventListener("keydown",this.handleKeydown),this.removeEventListener("focusin",this.handleFocusIn)}willUpdate(J){super.willUpdate(J),L(this.internals,{label:this.label,role:"menu"})}updated(J){super.updated(J);let Z=this.drilldown.page;for(let K of this.children){if(!(K instanceof s0))continue;this.mark(K,Z,Z===null)}if(this.placeTabStop(),this.toggleAttribute("data-drilled",!this.drilldown.atRoot),this.direction===void 0)this.removeAttribute("data-direction");else this.setAttribute("data-direction",this.direction)}mark(J,Z,K){J.onPage=K,J.showingPage=J===Z;for(let Q of J.children)if(Q instanceof s0&&Q.slot==="page")this.mark(Q,Z,J===Z)}render(){return F`${this.drilldown.atRoot?"":F`<div part="header">
            <button part="back" type="button" aria-label=${this.backLabel} @click=${()=>this.back()}>
              <svg part="back-mark" fill="currentColor" viewBox=${N0.viewBox} aria-hidden="true">
                ${S(N0.content)}
              </svg>
            </button>
            <span part="title">${this.drilldown.label}</span>
          </div>`}
      <div aria-busy=${this.loading?"true":z} part="page">
        <slot @slotchange=${(J)=>this.countRows(J)}></slot>
        ${this.renderStatus(this.hasRows)}
      </div>`}};Z4([q()],l7.prototype,"label",void 0);Z4([q({attribute:"back-label"})],l7.prototype,"backLabel",void 0);Z4([U()],l7.prototype,"direction",void 0);l7=Z4([G("helix-headless-drilldown")],l7);var pQ=N(`:host {
display: block;
}

[part="item"] {
all: unset;
align-items: center;
block-size: var(--helix-size-control-sm);
box-sizing: border-box;
inline-size: 100%;
color: var(--helix-color-foreground);
cursor: pointer;
display: flex;
font-family: var(--helix-font-sans);
font-size: var(--helix-text-sm);
gap: var(--helix-space-xs);

padding-inline: var(--helix-space-sm);
user-select: none;
}

[part="label"] {
flex: 1 1 auto;
overflow: hidden;
text-overflow: ellipsis;
white-space: nowrap;
}

:host(:not([disabled])) [part="item"]:hover {
background-color: var(
--drilldown-item-hover-color,
color-mix(in oklab, var(--helix-color-foreground) 8%, transparent)
);
}

[part="item"]:focus-visible {
outline: var(--helix-size-focus-ring) solid var(--helix-color-focus-ring);

outline-offset: calc(var(--helix-size-focus-offset) * -1);
}

:host([disabled]) [part="item"] {
cursor: default;
opacity: 0.5;
}`);var tz=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},gQ=class W extends s0{static{this.styles=pQ}};gQ=tz([G("helix-drilldown-item")],gQ);var nQ=N(`:host {
background-color: var(--drilldown-background, var(--helix-color-surface));
block-size: fit-content;
display: block;
inline-size: var(--drilldown-inline-size, 100%);

overflow: hidden;
}

[part="header"] {
align-items: center;

block-size: var(--helix-size-control-md);
border-block-end: var(--helix-border-thin) solid var(--helix-color-border);
display: flex;
gap: var(--helix-space-2xs);
padding-inline: var(--helix-space-2xs);
}

[part="back"] {
all: unset;
align-items: center;
block-size: var(--helix-size-control-sm);
border-radius: var(--helix-radii-sm);
box-sizing: border-box;
color: var(--helix-color-foreground-muted);
cursor: pointer;
display: flex;
inline-size: var(--helix-size-control-sm);
justify-content: center;
}

[part="back"] svg {
block-size: var(--helix-size-icon-sm);
inline-size: var(--helix-size-icon-sm);
}

[part="back"]:hover {
background-color: color-mix(in oklab, var(--helix-color-foreground) 8%, transparent);
color: var(--helix-color-foreground);
}

[part="back"]:focus-visible {
outline: var(--helix-size-focus-ring) solid var(--helix-color-focus-ring);
outline-offset: var(--helix-size-focus-offset);
}

[part="title"] {
color: var(--helix-color-foreground);
font-family: var(--helix-font-sans);
font-size: var(--helix-text-sm);
font-weight: var(--helix-weight-medium);
overflow: hidden;
text-overflow: ellipsis;
white-space: nowrap;
}

[part="page"] {
padding-block: var(--helix-space-2xs);
}

:host([data-direction="forward"]) [part="page"] {
animation: drilldown-forward var(--helix-duration-normal) var(--helix-easing-decelerate);
}

:host([data-direction="back"]) [part="page"] {
animation: drilldown-back var(--helix-duration-normal) var(--helix-easing-decelerate);
}

@keyframes drilldown-forward {
from {
opacity: 0;
translate: 12% 0;
}
}

@keyframes drilldown-back {
from {
opacity: 0;
translate: -12% 0;
}
}

@media (prefers-reduced-motion: reduce) {
:host([data-direction]) [part="page"] {
animation: none;
}
}

@media (prefers-reduced-motion: reduce) {
:host([data-direction="forward"]) [part="page"] {
animation: none;
}

:host([data-direction="back"]) [part="page"] {
animation: none;
}
}

:host(:dir(rtl)) [part="back"] svg {
scale: -1 1;
}

[part="empty"],
[part="loading"] {
color: var(--helix-color-foreground-subtle);
font-family: var(--helix-font-sans);
font-size: var(--helix-text-sm);
margin: var(--helix-space-none);
padding-block: var(--helix-space-md);
padding-inline: var(--helix-space-sm);
text-align: center;
}

:host([loading]) [part="page"] {
opacity: 0.5;
}

@media print {
:host {
display: none;
}
}`);var ez=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},lQ=class W extends l7{static{this.styles=nQ}};lQ=ez([G("helix-drilldown")],lQ);var cQ=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},D9=class W extends A{constructor(){super(...arguments);this.noAnnounce=!1}willUpdate(J){super.willUpdate(J),L(this.internals,{role:this.noAnnounce?"":"status"}),this.internals.ariaLive=this.noAnnounce?null:"polite"}render(){return F`<slot name="icon"></slot>
      <slot name="heading"></slot>
      <slot></slot>
      <slot name="actions"></slot>`}};cQ([q({attribute:"no-announce",reflect:!0,type:Boolean})],D9.prototype,"noAnnounce",void 0);D9=cQ([G("helix-headless-empty")],D9);var dQ=N(`:host {
align-items: center;
display: flex;
flex-direction: column;
gap: var(--helix-space-sm);
padding: var(--empty-inset, var(--helix-space-2xl));
text-align: center;
}

slot[name="icon"]::slotted(*) {

--icon-size: var(--helix-size-icon-lg);

color: var(--helix-color-foreground-subtle);
}

slot[name="heading"]::slotted(*) {
color: var(--helix-color-foreground);
font-size: var(--helix-text-lg);
font-weight: var(--helix-weight-semibold);
letter-spacing: var(--helix-tracking-tight);
margin: var(--helix-space-none);
}

slot:not([name]) {
color: var(--helix-color-foreground-muted);
font-size: var(--helix-text-sm);
}

slot:not([name])::slotted(*) {
margin: var(--helix-space-none);
max-inline-size: 46ch;
}
slot[name="actions"]::slotted(*) {
margin-block-start: var(--helix-space-sm);
}

@media print {
:host {
background-color: transparent;
box-shadow: none;
}
}`);var JV=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},iQ=class W extends D9{static{this.styles=dQ}};iQ=JV([G("helix-empty")],iQ);var rJ=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},ZV=(W,J)=>{let Z=["bytes","KB","MB","GB","TB"],K=W,Q=0;while(K>=1024&&Q<Z.length-1)K/=1024,Q+=1;let Y=new Intl.NumberFormat(J||void 0,{maximumFractionDigits:Q===0?0:1}).format(K),X=Q===0&&K===1?"byte":Z[Q];return`${Y} ${X}`},YV=(W)=>{let J=W.type.split("/")[1];if(J)return J.replace(/^x-/,"").split("+")[0]?.toUpperCase()??"File";let Z=W.name.includes(".")?W.name.split(".").pop():"";return Z?Z.toUpperCase():"File"},C1=class W extends k(E){constructor(){super(...arguments);this.accept="",this.multiple=!1,this.triggerLabel="Choose files",this.locale="",this.removeLabel="Remove",this.dropping=!1,this.handleChange=(J)=>{J.stopPropagation(),this.announce()},this.handleDragOver=(J)=>{if(this.isDisabled)return;J.preventDefault(),this.dropping=!0},this.handleDragLeave=()=>{this.dropping=!1},this.handleDrop=(J)=>{this.dropping=!1;let Z=this.control;if(this.isDisabled||!Z||!J.dataTransfer)return;J.preventDefault();let K=[...J.dataTransfer.files];if(K.length===0)return;let Q=new DataTransfer;for(let Y of this.multiple?[...this.files,...K]:K.slice(-1))Q.items.add(Y);Z.files=Q.files,this.announce()},this.handleRemove=(J)=>{let Z=Number(J.currentTarget.dataset.at);if(Number.isFinite(Z))this.removeAt(Z)}}get files(){return[...this.control?.files??[]]}get control(){if(typeof this.renderRoot?.querySelector!=="function")return null;return this.renderRoot.querySelector('[part="control"]')}clear(){let J=this.control;if(!J)return;J.value="",this.announce()}removeAt(J){let Z=this.control;if(!Z||typeof DataTransfer==="undefined")return;let K=new DataTransfer;for(let[Q,Y]of this.files.entries())if(Q!==J)K.items.add(Y);Z.files=K.files,this.announce()}announce(){this.sync(),this.requestUpdate(),this.dispatchEvent(new t0({value:this.files.map((J)=>J.name).join(", ")})),this.dispatchEvent(new Event("input",{bubbles:!0,composed:!0})),this.dispatchEvent(new Event("change",{bubbles:!0,composed:!1}))}sync(){let J=new FormData;if(this.name)for(let K of this.files)J.append(this.name,K);this.internals.setFormValue(J);let Z=this.control;if(!Z)return;this.internals.setValidity(Z.validity,Z.validationMessage,Z),this.refreshFeedback()}firstUpdated(J){super.firstUpdated(J),this.sync()}focus(J){this.control?.focus(J)}formResetCallback(){if(this.control)Q0(this.control,"");this.announce()}renderMeta(J){return T`<${this.tag("tag")} part="size"
    exportparts="dismiss: size-dismiss, dismiss-mark: size-dismiss-mark, prefix: size-prefix">${ZV(J.size,this.locale)}</${this.tag("tag")}>
      <${this.tag("tag")}
        part="kind"
      exportparts="dismiss: kind-dismiss, dismiss-mark: kind-dismiss-mark, prefix: kind-prefix">${YV(J)}</${this.tag("tag")}>`}render(){let J=this.files;return T`${this.renderLabel()}
      <div
        part="field"
        ?data-dropping=${this.dropping}
        @dragleave=${this.handleDragLeave}
        @dragover=${this.handleDragOver}
        @drop=${this.handleDrop}
      >
        <input
          part="control"
          id="control"
          type="file"
          accept=${this.accept||z}
          capture=${this.capture??z}
          name=${this.name||z}
          aria-describedby=${this.describedBy??z}
          ?disabled=${this.isDisabled}
          ?multiple=${this.multiple}
          ?required=${this.required}
          @change=${this.handleChange}
          @input=${this.stopInner}
        />
        <label part="trigger" for="control">
          <slot name="trigger">${this.triggerLabel}</slot>
        </label>
      </div>
      <!-- The hint sits under the field and the list goes last, which is the
           one ordering decision this component makes differently from the way it
           reads. Reasoning below the template. -->
      ${this.renderHint()}${this.renderFeedback()}
      ${J.length===0?z:T`<ul part="list">
              ${J.map((Z,K)=>T`<li part="file">
                  <span part="detail">
                    <span part="name">${Z.name}</span>
                    <span part="meta">
                      ${this.renderMeta(Z)}
                    </span>
                  </span>
                  <button
                    part="remove"
                    type="button"
                    aria-label=${`${this.removeLabel} ${Z.name}`}
                    data-at=${K}
                    ?disabled=${this.isDisabled}
                    @click=${this.handleRemove}
                  >
                    ${x(f6)}
                  </button>
                </li>`)}
            </ul>`}`}};rJ([q()],C1.prototype,"accept",void 0);rJ([q({reflect:!0,type:Boolean})],C1.prototype,"multiple",void 0);rJ([q()],C1.prototype,"capture",void 0);rJ([q({attribute:"trigger-label"})],C1.prototype,"triggerLabel",void 0);rJ([q()],C1.prototype,"locale",void 0);rJ([q({attribute:"remove-label"})],C1.prototype,"removeLabel",void 0);rJ([U()],C1.prototype,"dropping",void 0);C1=rJ([G("helix-headless-file-input")],C1);var sQ=N(`[part="field"] {
align-items: center;
position: relative;
background-color: var(--file-input-background-color, var(--helix-color-well));
border: var(--helix-border-thin) dashed var(--helix-color-border);
border-radius: var(--helix-radii-sm);
display: flex;
gap: var(--helix-space-xs);
justify-content: center;
padding: var(--file-input-inset, var(--helix-space-md));
transition:
background-color var(--helix-duration-fast) var(--helix-easing-standard),
border-color var(--helix-duration-fast) var(--helix-easing-standard);
}

[part="control"] {
cursor: pointer;
inset: 0;
opacity: 0;
position: absolute;
}

:host {
display: block;
}

[part="field"]:has([part="control"]:focus-visible) {
outline: var(--helix-size-focus-ring) solid var(--helix-color-focus-ring);
outline-offset: var(--helix-size-focus-offset);
}

[part="field"][data-dropping] {
background-color: var(--helix-color-primary-subtle);
border-color: var(--helix-color-primary);
border-style: solid;
}

[part="trigger"] {
align-items: center;
color: var(--helix-color-foreground);
display: flex;
flex-direction: column;
font-family: var(--helix-font-sans);
gap: var(--helix-space-2xs);
text-align: center;
font-size: var(--helix-text-md);
font-weight: var(--helix-weight-medium);

pointer-events: none;
}

[part="list"] {
display: flex;
flex-direction: column;
gap: var(--helix-space-2xs);
list-style: none;
margin-block: var(--helix-space-xs) 0;
padding: var(--helix-space-none);
}

[part="file"] {
align-items: center;
background-color: var(--helix-color-surface);
border: var(--helix-border-thin) solid var(--helix-color-border);
border-radius: var(--helix-radii-sm);
display: flex;
gap: var(--helix-space-sm);
opacity: 1;
padding-block: var(--helix-space-xs);
padding-inline: var(--helix-space-sm);
scale: 1 1;
transform-origin: top;
transition:
opacity var(--helix-duration-fast) var(--helix-easing-standard),
scale var(--helix-duration-fast) var(--helix-easing-emphasized);
}

@starting-style {
[part="file"] {
opacity: 0;
scale: 1 0.9;
}
}

[part="detail"] {
align-items: center;
column-gap: var(--helix-space-sm);
display: flex;
flex: 1 1 auto;
flex-wrap: wrap;
min-inline-size: 0;
row-gap: var(--helix-space-2xs);
}

[part="name"] {
min-inline-size: min(100%, 16ch);
}

[part="meta"] {
--helix-size-tag: var(--helix-size-tag-sm);

display: flex;
flex-wrap: wrap;
gap: var(--helix-space-2xs);
}

[part="size"] {
font-variant-numeric: tabular-nums;
}

[part="name"] {
color: var(--helix-color-foreground);
flex: 1 1 auto;
font-family: var(--helix-font-sans);
font-size: var(--helix-text-sm);

overflow-wrap: anywhere;
}

[part="remove"] {
all: unset;
--icon-size: var(--helix-size-icon-sm);

align-items: center;
border-radius: var(--helix-radii-sm);
box-sizing: border-box;
color: var(--helix-color-foreground-muted);
cursor: pointer;
display: flex;
flex: none;
justify-content: center;
min-block-size: var(--helix-size-icon-lg);
min-inline-size: var(--helix-size-icon-lg);
transition: color var(--helix-duration-fast) var(--helix-easing-standard);
}

[part="remove"]:hover {
color: var(--helix-color-danger);
}

[part="remove"]:focus-visible {
outline: var(--helix-size-focus-ring) solid var(--helix-color-focus-ring);
outline-offset: var(--helix-size-focus-offset);
}

:host(:disabled) [part="field"] {
border-style: solid;
color: var(--helix-color-foreground-subtle);
}

:host(:disabled) [part="control"],
:host(:disabled) [part="trigger"] {
cursor: not-allowed;
}

:host(:not(:disabled)) [part="field"]:hover {
border-color: var(--helix-color-foreground-muted);
}

@media (prefers-reduced-motion: reduce) {
[part="field"],
[part="file"],
[part="remove"] {
transition: none;
}

[part="file"] {
opacity: 1;
scale: 1 1;
}
}

::slotted(helix-icon[slot="trigger"]) {
--icon-size: var(--helix-size-icon-lg);

color: var(--helix-color-foreground-muted);
}

:host(:state(invalid)) [part="field"],
:host(:state(invalid)) [part="field"]:hover,
:host(:state(invalid):focus-within) [part="field"],
:host(:state(invalid):focus-within) [part="field"]:hover {
border-color: var(--helix-color-danger);
outline-color: var(--helix-color-danger);
}

@media print {
:host {
box-shadow: none;
print-color-adjust: exact;
}
}`);var WV=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},aQ=class W extends C1{static{this.tier="helix-"}static{this.styles=[A0,y,l,sQ]}};aQ=WV([G("helix-file-input")],aQ);var oQ=N(`:host {
display: flex;
flex-direction: row;
gap: var(--helix-space-none);
}

:host([inline]) {
display: inline-flex;
}

:host([direction="column"]) {
flex-direction: column;
}

:host([wrap]) {
flex-wrap: wrap;
}

:host([gap="2xs"]) {
gap: var(--helix-space-2xs);
}
:host([gap="xs"]) {
gap: var(--helix-space-xs);
}
:host([gap="sm"]) {
gap: var(--helix-space-sm);
}
:host([gap="md"]) {
gap: var(--helix-space-md);
}
:host([gap="lg"]) {
gap: var(--helix-space-lg);
}
:host([gap="xl"]) {
gap: var(--helix-space-xl);
}
:host([gap="2xl"]) {
gap: var(--helix-space-2xl);
}

:host([gap="3xl"]) {
gap: var(--helix-space-3xl);
}

:host([align]) {
text-align: inherit;
}

:host([align="start"]) {
align-items: flex-start;
}
:host([align="center"]) {
align-items: center;
}
:host([align="end"]) {
align-items: flex-end;
}
:host([align="baseline"]) {
align-items: baseline;
}

:host([justify="center"]) {
justify-content: center;
}
:host([justify="end"]) {
justify-content: flex-end;
}
:host([justify="between"]) {
justify-content: space-between;
}
:host([justify="around"]) {
justify-content: space-around;
}

@media print {
:host {
box-shadow: none;
}
}`);var c7=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},tJ=class W extends A{constructor(){super(...arguments);this.wrap=!1,this.inline=!1}render(){return F`<slot></slot>`}static{this.styles=oQ}};c7([q({reflect:!0})],tJ.prototype,"direction",void 0);c7([q({reflect:!0})],tJ.prototype,"gap",void 0);c7([q({reflect:!0})],tJ.prototype,"align",void 0);c7([q({reflect:!0})],tJ.prototype,"justify",void 0);c7([q({reflect:!0,type:Boolean})],tJ.prototype,"wrap",void 0);c7([q({reflect:!0,type:Boolean})],tJ.prototype,"inline",void 0);tJ=c7([G("helix-flex")],tJ);var U0=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},W0=class W extends A{constructor(){super(...arguments);this.date="",this.elapsed=!1,this.locale="",this.clock=void 0,this.written="",this.stopTicking=void 0,this.watching=void 0}get moment(){let J=this.date||this.written;if(J==="")return;let Z=new Date(J);return Number.isNaN(Z.getTime())?void 0:Z}get options(){let J={};if(this.day)J.day=this.day;if(this.hour)J.hour=this.hour;if(this.minute)J.minute=this.minute;if(this.month)J.month=this.month;if(this.second)J.second=this.second;if(this.timeZone)J.timeZone=this.timeZone;if(this.timeZoneName)J.timeZoneName=this.timeZoneName;if(this.weekday)J.weekday=this.weekday;if(this.year)J.year=this.year;return J}connectedCallback(){if(super.connectedCallback(),this.tick(),this.hasUpdated)this.watch()}disconnectedCallback(){super.disconnectedCallback(),this.stopTicking?.(),this.stopTicking=void 0,this.watching?.disconnect(),this.watching=void 0}firstUpdated(J){super.firstUpdated(J),this.read(),this.watch()}willUpdate(J){if(super.willUpdate(J),J.has("date")||J.has("elapsed")||J.has("locale"))this.tick()}read(){if(this.date!=="")return;let J=this.textContent?.trim()??"";if(J!==this.written)this.written=J,this.tick()}watch(){this.watching?.disconnect(),this.watching=new MutationObserver(()=>this.read()),this.watching.observe(this,{characterData:!0,childList:!0,subtree:!0})}tick(){this.stopTicking?.(),this.stopTicking=void 0;let J=this.moment;if(!J||!this.elapsed)return;let Z=new Date;this.clock=Z.getTime();let{next:K}=V6(this.locale)(J,Z);if(!Number.isFinite(K))return;this.stopTicking=FZ(K,()=>this.tick())}render(){let J=this.moment;if(!J)return z;let Z=this.elapsed?V6(this.locale)(J,new Date(this.clock??Date.now())).text:new Intl.DateTimeFormat(this.locale||void 0,this.options).format(J);return F`<time part="time" datetime=${J.toISOString()}>${Z}</time>`}};U0([q()],W0.prototype,"date",void 0);U0([q()],W0.prototype,"day",void 0);U0([q({reflect:!0,type:Boolean})],W0.prototype,"elapsed",void 0);U0([q()],W0.prototype,"hour",void 0);U0([q()],W0.prototype,"locale",void 0);U0([q()],W0.prototype,"minute",void 0);U0([q()],W0.prototype,"month",void 0);U0([q()],W0.prototype,"second",void 0);U0([q({attribute:"time-zone"})],W0.prototype,"timeZone",void 0);U0([q({attribute:"time-zone-name"})],W0.prototype,"timeZoneName",void 0);U0([q()],W0.prototype,"weekday",void 0);U0([q()],W0.prototype,"year",void 0);U0([U()],W0.prototype,"clock",void 0);U0([U()],W0.prototype,"written",void 0);W0=U0([G("helix-headless-format-date")],W0);var rQ=N(`:host {
display: inline;
}

:host([elapsed]) {
font-variant-numeric: tabular-nums;
}

@media print {
:host([elapsed]) [part="time"]::after {
content: " (" attr(datetime) ")";
}
}`);var KV=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},tZ=class W extends W0{static{this.tier="helix-"}static{this.styles=rQ}};tZ=KV([G("helix-format-date")],tZ);var tQ=N(`:host {
display: grid;

gap: var(--helix-space-none);
grid-template-columns: var(--grid-columns, var(--_grid-template, minmax(0, 1fr)));
}

:host([columns="2"]) {
grid-template-columns: var(--grid-columns, var(--_grid-template, repeat(2, minmax(0, 1fr))));
}
:host([columns="3"]) {
grid-template-columns: var(--grid-columns, var(--_grid-template, repeat(3, minmax(0, 1fr))));
}
:host([columns="4"]) {
grid-template-columns: var(--grid-columns, var(--_grid-template, repeat(4, minmax(0, 1fr))));
}
:host([columns="5"]) {
grid-template-columns: var(--grid-columns, var(--_grid-template, repeat(5, minmax(0, 1fr))));
}
:host([columns="6"]) {
grid-template-columns: var(--grid-columns, var(--_grid-template, repeat(6, minmax(0, 1fr))));
}

:host([gap="none"]) {
gap: var(--helix-space-none);
}
:host([gap="2xs"]) {
gap: var(--helix-space-2xs);
}
:host([gap="xs"]) {
gap: var(--helix-space-xs);
}
:host([gap="sm"]) {
gap: var(--helix-space-sm);
}

:host([gap="md"]) {
gap: var(--helix-space-md);
}
:host([gap="lg"]) {
gap: var(--helix-space-lg);
}
:host([gap="xl"]) {
gap: var(--helix-space-xl);
}
:host([gap="2xl"]) {
gap: var(--helix-space-2xl);
}

:host([gap="3xl"]) {
gap: var(--helix-space-3xl);
}

:host([align]) {
text-align: inherit;
}

:host([align="start"]) {
align-items: start;
}
:host([align="center"]) {
align-items: center;
}
:host([align="end"]) {
align-items: end;
}

@media print {
:host {
box-shadow: none;
}
}`);var P9=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},X5=class W extends A{constructor(){super(...arguments);this.min=""}applyTemplate(){let J=this.renderRoot.querySelector("#template");if(!J)return;let Z=/^-?(?:\d+\.?\d*|\.\d+)(?:px|r?em|%|v[hw]|ch|ex|cm|mm|in|pt|pc|q)$/i,K=this.min?.trim()??"";J.textContent=K!==""&&Z.test(K)?`:host { --_grid-template: repeat(auto-fit, minmax(min(${K}, 100%), 1fr)); }`:""}updated(J){if(super.updated(J),J.has("min"))this.applyTemplate()}render(){return F`<style id="template"></style>
      <slot></slot>`}static{this.styles=tQ}};P9([q({reflect:!0,type:Number})],X5.prototype,"columns",void 0);P9([q()],X5.prototype,"min",void 0);P9([q({reflect:!0})],X5.prototype,"gap",void 0);P9([q({reflect:!0})],X5.prototype,"align",void 0);X5=P9([G("helix-grid")],X5);var eZ=(W,J,Z)=>{if(W.tone)return W.tone;if(J.length===0)return;let K;for(let[Q,Y]of J.entries())if(W.value>=Y)K=Z[Q]??K;return K},JY=(W)=>W.split(/[\s,]+/).filter((J)=>J!=="").map(Number).filter((J)=>Number.isFinite(J)),ZY=(W)=>W.split(/[\s,]+/).filter((J)=>J!==""),YY=(W,J,Z,K,Q=1)=>{if(!Number.isFinite(J)||J<=0||Z<=0)return W;let Y=Math.max(1,Math.floor((J+K)/(Z+K)));return Math.min(W,Y*Math.max(1,Q))};var g1=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},x0=class W extends r1(A){constructor(){super(...arguments);this.rows=1,this.thresholds="",this.tones="",this.minCell=8,this.gap=2,this.emptyText="No readings",this.width=void 0,this.metrics=void 0,this.hovered=-1,this.observer=void 0,this.announced=void 0,this.onPointerOver=(J)=>{let Z=J.target?.closest?.('[part="cell"]'),K=Number(Z?.getAttribute("data-index")??-1);this.hovered=Number.isInteger(K)?K:-1},this.onPointerLeave=()=>{this.hovered=-1}}get visible(){return Math.min(this.points.length,this.room)}get points(){return this.series[0]?.points??[]}get rowCount(){return Math.max(1,Math.floor(this.rows)||1)}get cellPx(){return this.hasAttribute("min-cell")?this.minCell:this.metrics?.cell??this.minCell}get gapPx(){return this.hasAttribute("gap")?this.gap:this.metrics?.gap??this.gap}get room(){return YY(this.points.length,this.width??Number.NaN,this.cellPx,this.gapPx,this.rowCount)}measure(){let J=this.renderRoot?.querySelector('[part="strip"]');if(!J||typeof getComputedStyle!=="function")return;let Z=getComputedStyle(J),K=Number.parseFloat(Z.gridAutoColumns),Q=Number.parseFloat(Z.columnGap);if(!Number.isFinite(K)||K<=0||!Number.isFinite(Q)||Q<0)return;if(this.metrics?.cell!==K||this.metrics?.gap!==Q)this.metrics={cell:K,gap:Q};J.toggleAttribute("data-spaced",Q>0)}get drawn(){let J=this.points;return J.slice(Math.max(0,J.length-this.room))}connectedCallback(){if(super.connectedCallback(),typeof ResizeObserver!=="undefined")this.observer=new ResizeObserver((J)=>{let Z=J[0]?.contentRect.width;if(Z!==void 0&&Z!==this.width)this.width=Z}),this.observer.observe(this)}disconnectedCallback(){super.disconnectedCallback(),this.observer?.disconnect(),this.observer=void 0}willUpdate(J){super.willUpdate(J),L(this.internals,{label:this.label||"Heatmap",role:"img"})}markEmpty(){this.markRegion("footer",["start","summary","end"])}markRegion(J,Z,K){let Q=this.renderRoot?.querySelector(`[part="${J}"]`),Y=!Z.some((X)=>o(this.renderRoot?.querySelector(`slot[name="${X}"]`)))&&!(K&&this.renderRoot?.querySelector(K));Q?.toggleAttribute("data-empty",Y),Q?.toggleAttribute("hidden",Y)}updated(J){super.updated(J),this.markEmpty(),this.measure();let Z=this.visible,K=Z>0?String(Z):null;if(this.getAttribute("visible")!==K)if(K===null)this.removeAttribute("visible");else this.setAttribute("visible",K);if(this.announced!==void 0&&this.announced!==Z)this.dispatchEvent(new wJ({size:Z}));this.announced=Z}render(){let J=JY(this.thresholds),Z=ZY(this.tones),K=this.drawn;return F`<div
        part="strip"
        id="helix-chart-plot"
        style="--_heatmap-rows: ${this.rowCount}"
        @pointerover=${this.onPointerOver}
        @pointerleave=${this.onPointerLeave}
      >
        ${K.length===0?z:K.map((Q,Y)=>{let X=eZ(Q,J,Z);return X===void 0?F`<span part="cell" data-index=${Y}></span>`:F`<span
                part="cell"
                data-index=${Y}
                data-tone=${X}
                style="--heatmap-tone: var(--heatmap-tone-${X})"
              ></span>`})}
        ${this.renderTooltip()}
      </div>
      ${K.length===0?F`<p part="empty">${this.emptyText}</p>`:z}
      <div part="footer">
        <span part="start"><slot name="start"></slot></span>
        <span part="summary"><slot name="summary"></slot></span>
        <span part="end"><slot name="end"></slot></span>
      </div>`}renderTooltip(){let J=this.hovered;if(J<0)return z;let Z=this.points.length-this.drawn.length,K=this.cellPx,Q=this.gapPx,Y=Math.floor(J/this.rowCount),X=J%this.rowCount;return e0(this.sourceRows,Z+J,this.tag("tooltip"),{placement:"top",x:`${Y*(K+Q)+K/2}px`,y:`${X*(K+Q)}px`})}};g1([q({type:Number})],x0.prototype,"rows",void 0);g1([q()],x0.prototype,"thresholds",void 0);g1([q()],x0.prototype,"tones",void 0);g1([q({attribute:"min-cell",type:Number})],x0.prototype,"minCell",void 0);g1([q({type:Number})],x0.prototype,"gap",void 0);g1([q({attribute:"empty-text"})],x0.prototype,"emptyText",void 0);g1([U()],x0.prototype,"width",void 0);g1([U()],x0.prototype,"metrics",void 0);g1([U()],x0.prototype,"hovered",void 0);x0=g1([G("helix-headless-heatmap")],x0);var eQ=N(`:host {

display: grid;
grid-template-columns: minmax(0, max-content);

--_heatmap-cell-width: var(--heatmap-cell-width, var(--heatmap-cell-size, 0.75rem));
--_heatmap-cell-height: var(--heatmap-cell-height, var(--heatmap-cell-size, 0.75rem));

--heatmap-tone-accent: var(--helix-color-accent);
--heatmap-tone-danger: var(--helix-color-danger);
--heatmap-tone-info: var(--helix-color-info);
--heatmap-tone-muted: var(--helix-color-surface-sunken);
--heatmap-tone-primary: var(--helix-color-primary);
--heatmap-tone-success: var(--helix-color-success);
--heatmap-tone-warning: var(--helix-color-warning);

--heatmap-tone-1: color-mix(
in oklab,
var(--helix-color-primary-active) 20%,
var(--helix-color-surface-sunken)
);
--heatmap-tone-2: color-mix(
in oklab,
var(--helix-color-primary-active) 40%,
var(--helix-color-surface-sunken)
);
--heatmap-tone-3: color-mix(
in oklab,
var(--helix-color-primary-active) 60%,
var(--helix-color-surface-sunken)
);
--heatmap-tone-4: color-mix(
in oklab,
var(--helix-color-primary-active) 80%,
var(--helix-color-surface-sunken)
);
--heatmap-tone-5: var(--helix-color-primary-active);
}

[part="strip"] {
display: grid;
gap: var(--heatmap-gap, var(--helix-space-2xs));
grid-auto-columns: var(--_heatmap-cell-width);
grid-auto-flow: column;
grid-template-rows: repeat(var(--_heatmap-rows, 1), var(--_heatmap-cell-height));
justify-content: start;

position: relative;
}

[part="cell"] {
background-color: var(--heatmap-tone, var(--helix-color-surface-sunken));
border-radius: var(--heatmap-cell-radius, calc(var(--helix-radii-sm) * 0.5));
inline-size: var(--_heatmap-cell-width);
}

[part="mark"] {
block-size: 1px;
inline-size: 1px;
pointer-events: none;
position: absolute;
}

[part="tooltip-anchor"] {
inset: 0;
pointer-events: none;
position: absolute;
}

[part="tooltip-label"] {
color: var(--helix-color-foreground-muted);
display: block;
font-weight: var(--helix-weight-medium);
}

[part="tooltip-cell"] {
align-items: baseline;
display: flex;
gap: var(--helix-space-sm);
justify-content: space-between;
}

[part="tooltip-name"] {
color: var(--helix-color-foreground-muted);
}

[part="tooltip-value"] {
font-variant-numeric: tabular-nums;
font-weight: var(--helix-weight-medium);
}

@media (hover: hover) {
[part="cell"]:hover {
outline: var(--helix-border-thin) solid var(--helix-color-foreground);
outline-offset: var(--helix-border-thin);
}

[part="strip"]:not([data-spaced]) [part="cell"]:hover {
outline-offset: calc(var(--helix-border-thin) * -1);
}
}

[part="footer"] {
align-items: baseline;
color: var(--helix-color-foreground-subtle);
display: grid;
font-family: var(--helix-font-sans);
font-size: var(--helix-text-xs);
gap: var(--helix-space-xs);
grid-template-columns: auto minmax(0, 1fr) auto;
padding-block-start: var(--helix-space-xs);
}

[part="summary"] {
text-align: center;
}

[part="end"] {
text-align: end;
}

[part="footer"][data-empty] {
display: none;
}

[part="empty"] {
color: var(--helix-color-foreground-subtle);
font-family: var(--helix-font-sans);
font-size: var(--helix-text-sm);
margin: var(--helix-space-none);
text-align: center;
}

@media print {
[part="cell"] {
outline: var(--helix-border-thin) solid var(--helix-color-border);
outline-offset: calc(var(--helix-border-thin) * -1);
}
}`);var QV=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},WY=class W extends x0{constructor(){super(...arguments);this.gap=4,this.minCell=12}static{this.tier="helix-"}static{this.styles=eQ}};WY=QV([G("helix-heatmap")],WY);var K1=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},C0=class W extends A{constructor(){super(...arguments);this.src="",this.alt="",this.srcset="",this.sizes="",this.fetchPriority="auto",this.decoding="async",this.crossOrigin=null,this.referrerPolicy="",this.status="loading",this.answered="",this.handleLoad=(J)=>{this.announce("loaded",J)},this.handleError=(J)=>{this.announce("error",J)}}announce(J,Z){this.status=J;let K=J==="loaded"?"load":"error";if(Z){this.relayNativeEvent(Z);return}this.dispatchEvent(new Event(K,{bubbles:!1,cancelable:!1,composed:!1}))}settle(){let J=this.renderRoot?.querySelector("img");if(this.src===""||!J?.complete||J.naturalWidth===0)return;this.announce("loaded")}willUpdate(J){if(super.willUpdate(J),J.has("src")&&this.answered!==this.src)this.answered=this.src,this.status="loading"}updated(J){if(super.updated?.(J),J.has("src"))this.settle();if(J.has("status"))if(this.status==="loading")this.removeAttribute("data-status");else this.setAttribute("data-status",this.status)}firstUpdated(J){super.firstUpdated?.(J),this.settle()}get image(){return this.renderRoot?.querySelector("img")??null}get complete(){return this.image?.complete??!1}get currentSrc(){return this.image?.currentSrc??""}get naturalHeight(){return this.image?.naturalHeight??0}get naturalWidth(){return this.image?.naturalWidth??0}render(){return F`<img
        part="image"
        alt=${this.alt}
        loading=${this.loading??"lazy"}
        decoding=${this.decoding}
        crossorigin=${this.crossOrigin??z}
        referrerpolicy=${this.referrerPolicy||z}
        fetchpriority=${this.fetchPriority}
        src=${this.src||z}
        srcset=${this.srcset||z}
        sizes=${this.sizes||z}
        @load=${this.handleLoad}
        @error=${this.handleError}
      />
      <span
        part="placeholder"
        aria-hidden="true"
        ?hidden=${this.status!=="loading"}
        ><slot name="placeholder"></slot
      ></span>
      <span
        part="fallback"
        aria-hidden="true"
        ?hidden=${this.status!=="error"}
        ><slot name="fallback"></slot
      ></span>`}};K1([q()],C0.prototype,"src",void 0);K1([q()],C0.prototype,"alt",void 0);K1([q({reflect:!0})],C0.prototype,"loading",void 0);K1([q()],C0.prototype,"srcset",void 0);K1([q()],C0.prototype,"sizes",void 0);K1([q({attribute:"fetch-priority"})],C0.prototype,"fetchPriority",void 0);K1([q()],C0.prototype,"decoding",void 0);K1([q({attribute:"crossorigin"})],C0.prototype,"crossOrigin",void 0);K1([q({attribute:"referrerpolicy"})],C0.prototype,"referrerPolicy",void 0);K1([q({attribute:!1})],C0.prototype,"status",void 0);K1([U()],C0.prototype,"answered",void 0);C0=K1([G("helix-headless-image")],C0);var JX=N(`:host {
aspect-ratio: var(--image-aspect, auto);
display: block;
overflow: hidden;
position: relative;
}

:host([rounded]) {
border-radius: var(--image-radius, var(--helix-radii-md));
}

[part="image"] {
block-size: 100%;
display: block;
inline-size: 100%;
object-fit: var(--image-fit, cover);
object-position: var(--image-position, center);
}

:host([data-status="error"]) [part="image"] {
visibility: hidden;
}

[part="placeholder"],
[part="fallback"] {
align-items: center;
display: flex;
inset: 0;
justify-content: center;
position: absolute;
}

:host [part="placeholder"][hidden],
:host [part="fallback"][hidden] {
display: none;
}

[part="placeholder"] {
background-color: var(--image-placeholder-color, var(--helix-color-surface-sunken));
}

[part="placeholder"] ::slotted(*) {
block-size: 100%;
inline-size: 100%;
}

[part="fallback"] {
background-color: var(--image-placeholder-color, var(--helix-color-surface-sunken));
color: var(--helix-color-foreground-subtle);
}

[part="image"] {
opacity: 0;
transition: opacity var(--helix-duration-normal) var(--helix-easing-standard);
}

:host([data-status="loaded"]) [part="image"] {
opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
[part="image"] {
transition: none;
}
}

@media print {
:host {
box-shadow: none;
}
}`);var ZX=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},KY=class W extends C0{constructor(){super(...arguments);this.rounded=!1}static{this.styles=JX}};ZX([q({reflect:!0,type:Boolean})],KY.prototype,"rounded",void 0);KY=ZX([G("helix-image")],KY);var a0=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},D0=class W extends u(k(E)){constructor(){super(...arguments);this.announcesInput=!0,this.autocomplete="",this.placeholder="",this.readOnly=!1,this.type="text",this.clearable=!1,this.clearLabel="Clear",this.reveal=!1,this.revealLabel="Show password",this.revealed=!1,this.handleInput=(J)=>{J.stopPropagation();let Z=J.target,K=Z.value;this.requestValue(K),Q0(Z,this.value)},this.handleClear=()=>{this.requestValue("");let J=this.control;if(J)Q0(J,this.value),J.focus()},this.handleChange=(J)=>{J.stopPropagation(),this.dispatchEvent(new Event("change",{bubbles:!0,composed:!1}))},this.pattern=""}get effectiveType(){return this.revealed&&this.type==="password"?"text":this.type}get showsClear(){return this.clearable&&this.value!==""&&!this.isDisabled&&!this.readOnly}static{this.shadowRootOptions={...E.shadowRootOptions,delegatesFocus:!0}}get selectionDirection(){return this.control?.selectionDirection??"none"}set selectionDirection(J){let Z=this.control;if(Z)Z.selectionDirection=J}get selectionEnd(){return this.control?.selectionEnd??0}set selectionEnd(J){let Z=this.control;if(Z)Z.selectionEnd=J}get selectionStart(){return this.control?.selectionStart??0}set selectionStart(J){let Z=this.control;if(Z)Z.selectionStart=J}setSelectionRange(J,Z,K){this.control?.setSelectionRange(J,Z,K)}get control(){return this.renderRoot.querySelector('[part="control"]')}sync(){this.internals.setFormValue(this.value);let J=this.control;if(!J)return;this.internals.setValidity(J.validity,J.validationMessage,J),this.refreshFeedback()}focus(J){this.control?.focus(J)}select(){this.control?.select()}willUpdate(J){if(super.willUpdate(J),!this.hasUpdated)return;let Z=this.control;if(J.has("value")&&Z&&this.shadowRoot?.activeElement===Z)this.releaseCaret=S7(Z)}updated(J){super.updated(J),this.releaseCaret?.(),this.releaseCaret=void 0,this.sync()}render(){return F`${this.renderLabel()}
    <div part="field">
      <slot name="start"></slot>
      <input
        part="control"
        id="control"
        .value=${this.value}
        type=${this.effectiveType}
        name=${this.name||z}
        placeholder=${this.placeholder||z}
        autocomplete=${this.autocomplete||z}
        pattern=${this.pattern||z}
        minlength=${this.minLength??z}
        maxlength=${this.maxLength??z}
        aria-describedby=${this.describedBy??z}
        ?disabled=${this.isDisabled}
        ?readonly=${this.readOnly}
        ?required=${this.required}
        @input=${this.handleInput}
        @change=${this.handleChange}
      />
      <slot name="end"></slot>
      <!-- In the tab order, unlike the browser's own search clear, which is not
           reachable by keyboard at all. That is defensible for a native control
           a reader can empty with select-all and Delete, and less so for one
           whose only affordance is an icon: a control that exists on screen and
           cannot be reached is one a keyboard reader is told about and cannot
           use. It only exists while there is a value, so the extra stop appears
           exactly when there is something to do with it. -->
      ${this.showsClear?F`<button
              part="clear"
              type="button"
              aria-label=${this.clearLabel}
              @click=${this.handleClear}
            >
              ${x(B0)}
            </button>`:z}
      ${this.reveal&&this.type==="password"?F`<button
              part="reveal"
              type="button"
              aria-label=${this.revealLabel}
              aria-pressed=${this.revealed?"true":"false"}
              ?disabled=${this.isDisabled}
              @click=${()=>{this.revealed=!this.revealed}}
            >
              ${x(this.revealed?C6:U6)}
            </button>`:z}
    </div>
    ${this.renderHint()}${this.renderFeedback()}`}};a0([q()],D0.prototype,"autocomplete",void 0);a0([q()],D0.prototype,"placeholder",void 0);a0([q({attribute:"read-only",reflect:!0,type:Boolean})],D0.prototype,"readOnly",void 0);a0([q()],D0.prototype,"type",void 0);a0([q({type:Boolean})],D0.prototype,"clearable",void 0);a0([q({attribute:"clear-label"})],D0.prototype,"clearLabel",void 0);a0([q({type:Boolean})],D0.prototype,"reveal",void 0);a0([q({attribute:"reveal-label"})],D0.prototype,"revealLabel",void 0);a0([U()],D0.prototype,"revealed",void 0);a0([q()],D0.prototype,"pattern",void 0);a0([q({attribute:"minlength",type:Number})],D0.prototype,"minLength",void 0);a0([q({attribute:"maxlength",type:Number})],D0.prototype,"maxLength",void 0);D0=a0([G("helix-headless-input")],D0);var YX=N(`:host {
display: flex;
flex-direction: column;
gap: var(--helix-space-2xs);

--_input-size: var(--input-size, var(--helix-size-control));
}

[part="field"] {
align-items: center;
background-color: var(--input-background-color, var(--helix-color-well));
block-size: var(--_input-size);
border: var(--helix-border-thin) solid var(--helix-color-border);
border-radius: var(--helix-radii-sm);
color: var(--helix-color-foreground-subtle);
display: flex;
gap: var(--helix-space-2xs);
padding-inline: var(--helix-space-xs);
transition:
border-color var(--helix-duration-fast) var(--helix-easing-standard),
background-color var(--helix-duration-fast) var(--helix-easing-standard);
}

:host(:not(:disabled)) [part="field"]:hover {
border-color: var(--helix-color-primary);
}

:host(:focus-within) [part="field"],
:host(:focus-within) [part="field"]:hover {
border-color: var(--helix-color-primary);
outline: var(--helix-size-focus-ring) solid var(--helix-color-focus-ring);
outline-offset: 0;
}

:host(:state(invalid)) [part="field"],
:host(:state(invalid)) [part="field"]:hover,
:host(:state(invalid):focus-within) [part="field"],
:host(:state(invalid):focus-within) [part="field"]:hover {
border-color: var(--helix-color-danger);
outline-color: var(--helix-color-danger);
}

[part="control"] {
all: unset;

box-sizing: border-box;
block-size: 100%;
color: var(--helix-color-foreground);
flex: 1 1 auto;
font-family: var(--helix-font-sans);
font-size: var(--helix-text-sm);
font-weight: var(--helix-weight-medium);
min-inline-size: 0;
}

[part="control"]::-webkit-search-cancel-button {
appearance: none;
}

slot[name="start"]::slotted(*),
slot[name="end"]::slotted(*) {
color: var(--helix-color-foreground-subtle);
flex: 0 0 auto;
}

:host(:disabled) [part="field"] {
cursor: not-allowed;
opacity: 0.5;
}

:host([read-only]) [part="field"] {
background-color: transparent;
}

[part="clear"],
[part="reveal"] {
all: unset;
--icon-size: var(--helix-size-icon-sm);

align-items: center;
border-radius: var(--helix-radii-sm);
box-sizing: border-box;
color: var(--helix-color-foreground-muted);
cursor: pointer;
display: flex;
flex: 0 0 auto;
justify-content: center;
min-block-size: var(--helix-size-icon-lg);
min-inline-size: var(--helix-size-icon-lg);
transition: color var(--helix-duration-fast) var(--helix-easing-standard);
}

[part="clear"]:hover,
[part="reveal"]:hover {
color: var(--helix-color-foreground);
}

[part="clear"]:focus-visible,
[part="reveal"]:focus-visible {
outline: var(--helix-size-focus-ring) solid var(--helix-color-focus-ring);
outline-offset: var(--helix-size-focus-offset);
}

[part="reveal"][aria-pressed="true"] {
color: var(--helix-color-foreground);
}

@media (prefers-reduced-motion: reduce) {
[part="field"],
[part="clear"],
[part="reveal"] {
transition: none;
}
}

@media print {
:host {
box-shadow: none;
print-color-adjust: exact;
}
}`);var XV=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},WX=class W extends D0{static{this.styles=[A0,y,l,YX]}};WX=XV([G("helix-input")],WX);var XY=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},$V={alt:"⌥",backspace:"⌫",cmd:"⌘",ctrl:"⌃",del:"⌦",down:"↓",enter:"↵",esc:"Esc",left:"←",meta:"⌘",mod:"⌘",opt:"⌥",right:"→",shift:"⇧",space:"Space",tab:"⇥",up:"↑"},qV={alt:"Alt",backspace:"Backspace",cmd:"Win",ctrl:"Ctrl",del:"Del",down:"↓",enter:"Enter",esc:"Esc",left:"←",meta:"Win",mod:"Ctrl",opt:"Alt",right:"→",shift:"Shift",space:"Space",tab:"Tab",up:"↑"},QY=()=>typeof navigator!=="undefined"&&/mac|iphone|ipad|ipod/i.test(navigator.userAgent),$5=class W extends A{constructor(){super(...arguments);this.keys="",this.handleKeydown=(J)=>{let Z=J;if(Z.isComposing)return;if(!this.matches_(Z))return;let K=new S8({keys:this.keys});if(this.dispatchEvent(K),!K.defaultPrevented)Z.preventDefault()}}connectedCallback(){super.connectedCallback(),this.listen()}disconnectedCallback(){super.disconnectedCallback(),this.deafen()}updated(J){if(super.updated(J),J.has("within")||J.has("keys"))this.deafen(),this.listen()}get label(){let J=QY()?$V:qV;return this.keys.split("+").map((K)=>K.trim()).filter((K)=>K!=="").map((K)=>J[K.toLowerCase()]??(K.length===1?K.toUpperCase():K)).join(QY()?"":"+")}listen(){if(!this.within||this.keys==="")return;let J=this.within==="document"?this.ownerDocument:this.parentElement;if(!J)return;this.listening=J,J.addEventListener("keydown",this.handleKeydown)}deafen(){this.listening?.removeEventListener("keydown",this.handleKeydown),this.listening=void 0}matches_(J){let Z=this.keys.split("+").map((X)=>X.trim().toLowerCase()).filter((X)=>X!=="");if(Z.length===0)return!1;let K=Z[Z.length-1]??"",Q=new Set(Z.slice(0,-1)),Y=QY()?J.metaKey:J.ctrlKey;return J.key.toLowerCase()===K&&(Q.has("mod")?Y:!0)&&(Q.has("shift")?J.shiftKey:!J.shiftKey)&&(Q.has("alt")||Q.has("opt")?J.altKey:!J.altKey)&&(Q.has("ctrl")?J.ctrlKey:Q.has("mod")?!0:!J.ctrlKey)&&(Q.has("cmd")||Q.has("meta")?J.metaKey:Q.has("mod")?!0:!J.metaKey)}render(){return F`<kbd part="kbd">${this.keys===""?F`<slot></slot>`:this.label}</kbd>`}};XY([q()],$5.prototype,"keys",void 0);XY([q({reflect:!0})],$5.prototype,"within",void 0);$5=XY([G("helix-headless-kbd")],$5);var KX=N(`:host {
display: inline-flex;
font: inherit;

vertical-align: -0.05em;

--_kbd-size: 0.85em;
--_kbd-height: 1.5em;
--_kbd-inset: 0.4em;
}

[part="kbd"] {
align-items: center;
background-color: var(--kbd-background-color, var(--helix-color-surface-sunken));
block-size: var(--_kbd-height);
border: var(--helix-border-thin) solid var(--kbd-border-color, var(--helix-color-border));
border-radius: var(--helix-radii-sm);

box-shadow: inset 0 -1px 0 0 var(--kbd-border-color, var(--helix-color-border));
color: var(--helix-color-foreground-muted);
display: inline-flex;
font-family: var(--helix-font-mono);

font-feature-settings:
"liga" 0,
"calt" 0;
font-size: var(--_kbd-size);
font-variant-ligatures: none;
font-weight: var(--helix-weight-medium);
justify-content: center;
line-height: 1;

min-inline-size: var(--_kbd-height);

white-space: nowrap;
padding-inline: var(--_kbd-inset);

padding-block-start: var(--helix-border-thin);
}

@media print {
:host {
box-shadow: none;
}
}`);var GV=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},QX=class W extends $5{static{this.styles=KX}};QX=GV([G("helix-kbd")],QX);var $Y=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},XX=24,q5=class W extends A{constructor(){super(...arguments);this.for="",this.source=new HJ(this)}willUpdate(J){if(J.has("for"))this.source.watch()}names(){let J=this.source.series;return this.entries==="categories"?J[0]?.points.map((Z)=>Z.label)??[]:J.map((Z)=>Z.name)}render(){return F`<ul part="list" role="list">
      ${this.names().map((J,Z)=>F`<li
          data-series=${Z%XX+1}
          part="entry"
          style="--chart-series: var(--chart-series-${Z%XX+1})"
          role="listitem"
        >
          <span aria-hidden="true" part="swatch"></span>
          <span part="name">${J}</span>
        </li>`)}
    </ul>`}};$Y([q({reflect:!0})],q5.prototype,"entries",void 0);$Y([q()],q5.prototype,"for",void 0);q5=$Y([G("helix-headless-legend")],q5);var $X=N(`:host {
display: block;
}

[part="list"] {
display: flex;
flex-direction: var(--legend-direction, row);

flex-wrap: wrap;
gap: var(--legend-gap, var(--helix-space-sm));
list-style: none;
margin: var(--helix-space-none);
padding: var(--helix-space-none);
}

[part="entry"] {
align-items: center;
color: var(--helix-color-foreground-muted);
display: flex;
font-size: var(--helix-text-sm);
gap: var(--helix-space-2xs);
line-height: var(--helix-leading-tight);
}

:host([placement="start"]) [part="list"],
:host([placement="end"]) [part="list"] {
flex-direction: column;
}

:host([placement="end"]) [part="entry"] {
flex-direction: row-reverse;
text-align: end;
}

[part="swatch"] {
block-size: var(--legend-swatch-size, var(--helix-space-sm));

border-radius: var(--helix-radii-sm);
flex: 0 0 auto;
inline-size: var(--legend-swatch-size, var(--helix-space-sm));
}

[part="entry"] [part="swatch"] {
background-color: color-mix(
in oklab,
var(--chart-series) calc(var(--_legend-area, 1) * var(--_legend-through, 1) * 100%),
transparent
);
}

[part="entry"][data-emphasis="outlined"] [part="swatch"],
:host([emphasis="outlined"]) [part="entry"]:not([data-emphasis]) [part="swatch"] {
background-color: color-mix(
in oklab,
var(--_legend-shade) calc(var(--_legend-through, 1) * 100%),
transparent
);
border: var(--legend-swatch-stroke, var(--helix-border-thick)) solid
color-mix(in oklab, var(--chart-series) calc(var(--_legend-through, 1) * 100%), transparent);
}

[part="entry"][data-emphasis="subtle"] [part="swatch"],
:host([emphasis="subtle"]) [part="entry"]:not([data-emphasis]) [part="swatch"] {
border: var(--legend-swatch-stroke, var(--helix-border-thick)) solid
color-mix(in oklab, var(--chart-series) calc(var(--_legend-through, 1) * 100%), transparent);

--_legend-area: 0.2;
}

[part="swatch"] {
--_legend-shade: color-mix(in oklab, var(--chart-series) 60%, var(--helix-color-background));
}

[part="entry"][data-material="glass"] [part="swatch"],
:host([material="glass"]) [part="entry"]:not([data-material]) [part="swatch"] {
--_legend-through: calc(0.62 * var(--helix-material-opacity));
}

[part="entry"][data-material="frosted"],
:host([material="frosted"]) [part="entry"]:not([data-material]) [part="swatch"] {
--_legend-through: calc(0.88 * var(--helix-material-opacity));
}

@media print {
:host {
box-shadow: none;
}
}`);var d7=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},eJ=class W extends q5{static{this.styles=[lJ,$X]}updated(J){super.updated(J);let Z=this.names().map((O)=>O.trim().toLowerCase()),K=(O)=>new Set((O??"").split(/[\s,]+/).filter(Boolean).map((B)=>B.toLowerCase()).flatMap((B)=>{let D=Z.indexOf(B);return D<0?[]:[D]})),Q=(O,B,D)=>{if(D)O.setAttribute(`data-${B}`,D);else O.removeAttribute(`data-${B}`)},Y=K(this.outlined),X=K(this.subtle),$=K(this.glass),V=[...this.renderRoot.querySelectorAll('[part="entry"]')];for(let[O,B]of V.entries())Q(B,"emphasis",Y.has(O)?"outlined":X.has(O)?"subtle":void 0),Q(B,"material",$.has(O)?"glass":void 0)}};d7([q({reflect:!0})],eJ.prototype,"placement",void 0);d7([q({reflect:!0})],eJ.prototype,"emphasis",void 0);d7([q({reflect:!0})],eJ.prototype,"material",void 0);d7([q()],eJ.prototype,"outlined",void 0);d7([q()],eJ.prototype,"subtle",void 0);d7([q()],eJ.prototype,"glass",void 0);eJ=d7([G("helix-legend")],eJ);var G5=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},i7=100,GJ=100,zJ=class W extends r1(A){constructor(){super(...arguments);this.area=!1,this.zero=!1}get rulesValue(){return this.gridlines!==void 0&&this.gridlines!=="category"}get rulesCategory(){return this.gridlines==="both"||this.gridlines==="category"}range(J){let Z=J.flatMap((Y)=>Y.points.map((X)=>X.value)),[K,Q]=e1(Z.length>0?Z:[0]);return this.zero?[Math.min(0,K),Math.max(0,Q)]:[K,Q]}ends(J,Z,K){return J.flatMap((Q,Y)=>{let X=Q.points.at(-1);if(!X||Q.points.length<2)return[];return[{index:c(Y),x:Z(Q.points.length-1)/i7*100,y:K(X.value)/GJ*100}]})}render(){let J=this.series,Z=J[0]?.points.map(($)=>$.label)??[];if(Z.length===0)return F`<div id="helix-chart-plot" part="plot"></div>`;let K=this.range(J),Q=j0(K,[GJ,0]),Y=i7/Z.length,X=j0([0,Math.max(Z.length-1,1)],[Y/2,i7-Y/2]);return F`${this.renderPlot(J,X,Q,K)} ${this.renderLabels(Z)}`}renderPlot(J,Z,K,Q){let Y=Q[0]<=0&&Q[1]>=0?K(0):void 0,X=this.terminus==="none"?[]:this.ends(J,Z,K),$=this.terminus==="ring"&&X.length>0?X.map((V)=>`radial-gradient(circle at ${V.x}% ${V.y}%, #0000 calc(var(--_chart-terminus-inner) - 0.5px), #000 var(--_chart-terminus-inner))`).join(", "):void 0;return F`<div
      aria-hidden="true"
      id="helix-chart-plot"
      part="plot"
      style=${$?`--_line-chart-holes: ${$}`:z}
    >
      <svg part="svg"
        preserveAspectRatio="none"
        viewBox="0 0 ${i7} ${GJ}"
        xmlns="http://www.w3.org/2000/svg"
      >
        ${this.renderGridlines(Z,K,Q,J[0]?.points.length??0)}
        ${Y===void 0?z:_`<line part="baseline" x1="0" x2=${i7} y1=${Y} y2=${Y} />`}
        ${this.renderBand(J[0]?.points.length??0)}
        ${this.renderGuide(Z)}
        ${J.map((V,O)=>this.renderSeries(V,O,Z,K))}
      </svg>
      ${this.renderTermini(X)}
      ${this.renderTooltip()}
    </div>`}renderGridlines(J,Z,K,Q){if(this.gridlines===void 0)return z;let Y=this.rulesCategory?Array.from({length:Q},($,V)=>_`<line part="gridline" x1=${J(V)} x2=${J(V)} y1="0" y2=${GJ} />`):[],X=this.rulesValue?yJ(K).map(($)=>_`<line part="gridline" x1="0" x2=${i7} y1=${Z($)} y2=${Z($)} />`):[];return _`${Y}${X}`}renderBand(J){let Z=this.pointer.at;if(Z<0||J===0)return z;let K=i7/J;return _`<rect height=${GJ} part="band" width=${K} x=${Z*K} y="0" />`}renderGuide(J){let Z=this.pointer.at;if(Z<0)return z;return _`<line part="guide" x1=${J(Z)} x2=${J(Z)} y1="0" y2=${GJ} />`}renderTermini(J){if(J.length===0)return z;return F`${J.map((Z)=>F`<span
          aria-hidden="true"
          part="terminus"
          style=${`--chart-series: var(--chart-series-${Z.index}); --chart-terminus-x: ${Z.x}%; --chart-terminus-y: ${Z.y}%`}
        ></span>`)}`}renderSeries(J,Z,K,Q){let Y=J.points.map((D,P)=>[K(P),Q(D.value)]),X=L7(Y,this.curve??"smooth");if(X==="")return F`${z}`;let $=c(Z),V=Y[0],O=Y.at(-1),B=`${X}L${O[0]},${GJ}L${V[0]},${GJ}Z`;return _`${this.area?_`<path
            d=${B}
            data-series=${$}
            part="area"
            style="--chart-series: var(--chart-series-${$})"
          />`:z}<path
      d=${X}
      data-series=${$}
      fill="none"
      part="line"
      style="--chart-series: var(--chart-series-${$})"
    />`}renderLabels(J){return F`<div aria-hidden="true" part="labels">
      ${J.map((Z)=>F`<span part="label">${Z}</span>`)}
    </div>`}renderTooltip(){let J=this.pointer.at,Z=this.series;if(J<0||Z.length===0)return e0(this.sourceRows,J,this.tag("tooltip"));let K=this.range(Z),Q=j0(K,[GJ,0]),Y=Z.map(($)=>$.points[J]?.value).filter(($)=>$!==void 0).map(($)=>Q($)),X=100/this.readings;return e0(this.sourceRows,J,this.tag("tooltip"),{placement:"top",x:`${J*X+X/2}%`,y:`${Y.length>0?Math.min(...Y):0}%`})}};G5([q({reflect:!0,type:Boolean})],zJ.prototype,"area",void 0);G5([q({reflect:!0})],zJ.prototype,"curve",void 0);G5([q()],zJ.prototype,"gridlines",void 0);G5([q({reflect:!0,type:Boolean})],zJ.prototype,"zero",void 0);G5([q({reflect:!0})],zJ.prototype,"terminus",void 0);zJ=G5([G("helix-headless-line-chart")],zJ);var Y4=N(`[part="terminus"] {
background-color: currentColor;
block-size: var(--chart-terminus-size, 5px);
inline-size: var(--chart-terminus-size, 5px);
inset-block-start: var(--chart-terminus-y);
inset-inline-start: var(--chart-terminus-x);
position: absolute;

translate: -50% -50%;
}

[part="terminus"] {
border-radius: var(--helix-radii-full);
}

:host([terminus="none"]) [part="terminus"] {
display: none;
}

:host([terminus="square"]) [part="terminus"] {
border-radius: var(--helix-radii-none);
}

:host([terminus="ring"]) [part="terminus"] {
background-color: var(--chart-terminus-hole, transparent);
block-size: calc(var(--chart-terminus-size, 5px) * 1.6);
border: var(--helix-border-thick) solid currentColor;
inline-size: calc(var(--chart-terminus-size, 5px) * 1.6);
}

:host([terminus="ring"]) {
--_chart-terminus-inner: calc(var(--chart-terminus-size, 5px) * 0.8 - var(--helix-border-thick));
}

:host([terminus="triangle"]) [part="terminus"] {
background-color: currentColor;
border-radius: var(--helix-radii-none);
clip-path: polygon(0% 0%, 100% 50%, 0% 100%);
}`);var qX=N(`:host {
display: grid;
position: relative;
gap: var(--line-chart-gap, var(--helix-space-2xs));
}

[part="plot"] {
position: relative;

block-size: var(--line-chart-block-size, 12em);
}

[part="plot"] svg {
block-size: 100%;
inline-size: 100%;

overflow: visible;
}

[part="line"] {
stroke-linecap: round;
stroke-linejoin: round;
stroke-width: var(--line-chart-width, 2px);
vector-effect: non-scaling-stroke;
}

[part="area"] {

opacity: calc(var(--line-chart-area-opacity, 0.16) * var(--helix-material-opacity));
stroke: none;
}

[part="baseline"] {
stroke: var(--helix-color-border);
stroke-width: var(--helix-border-thin);
vector-effect: non-scaling-stroke;
}

[part="labels"] {
display: grid;
grid-auto-columns: 1fr;
grid-auto-flow: column;
}

[part="label"] {
color: var(--helix-color-foreground-muted);
font-size: var(--helix-text-xs);
overflow: hidden;
text-align: center;
text-overflow: ellipsis;
white-space: nowrap;
}

[part="line"] {
stroke: var(--chart-series);
}

[part="terminus"] {
color: var(--chart-series);
}

:host([terminus="ring"]) [part="svg"] {
mask-composite: intersect;
mask-image: var(--_line-chart-holes);
}

[part="area"] {
fill: var(--chart-series);
}

[part="mark"] {
block-size: 1px;
inline-size: 1px;
pointer-events: none;
position: absolute;
}

[part="tooltip-anchor"] {
inset: 0;
pointer-events: none;
position: absolute;
}

[part="tooltip-label"] {
color: var(--helix-color-foreground-muted);
display: block;
font-weight: var(--helix-weight-medium);
}

[part="tooltip-cell"] {
align-items: baseline;
display: flex;
gap: var(--helix-space-sm);
justify-content: space-between;
}

[part="tooltip-name"] {
color: var(--helix-color-foreground-muted);
}

[part="tooltip-value"] {
font-variant-numeric: tabular-nums;
font-weight: var(--helix-weight-medium);
}

[part="tooltip-cell"][data-series]::before {
block-size: 0.5em;
border-radius: var(--helix-radii-full);
content: "";
inline-size: 0.5em;
}

[part="tooltip-cell"][data-series="1"]::before {
background-color: var(--helix-color-series-1);
}

[part="tooltip-cell"][data-series="2"]::before {
background-color: var(--helix-color-series-2);
}

[part="tooltip-cell"][data-series="3"]::before {
background-color: var(--helix-color-series-3);
}

[part="tooltip-cell"][data-series="4"]::before {
background-color: var(--helix-color-series-4);
}

[part="tooltip-cell"][data-series="5"]::before {
background-color: var(--helix-color-series-5);
}

[part="tooltip-cell"][data-series="6"]::before {
background-color: var(--helix-color-series-6);
}

[part="tooltip-cell"][data-series="7"]::before {
background-color: var(--helix-color-series-7);
}

[part="tooltip-cell"][data-series="8"]::before {
background-color: var(--helix-color-series-8);
}

[part="tooltip-cell"][data-series="9"]::before {
background-color: var(--helix-color-series-9);
}

[part="tooltip-cell"][data-series="10"]::before {
background-color: var(--helix-color-series-10);
}

[part="tooltip-cell"][data-series="11"]::before {
background-color: var(--helix-color-series-11);
}

[part="tooltip-cell"][data-series="12"]::before {
background-color: var(--helix-color-series-12);
}

[part="tooltip-cell"][data-series="13"]::before {
background-color: var(--helix-color-series-13);
}

[part="tooltip-cell"][data-series="14"]::before {
background-color: var(--helix-color-series-14);
}

[part="tooltip-cell"][data-series="15"]::before {
background-color: var(--helix-color-series-15);
}

[part="tooltip-cell"][data-series="16"]::before {
background-color: var(--helix-color-series-16);
}

[part="tooltip-cell"][data-series="17"]::before {
background-color: var(--helix-color-series-17);
}

[part="tooltip-cell"][data-series="18"]::before {
background-color: var(--helix-color-series-18);
}

[part="tooltip-cell"][data-series="19"]::before {
background-color: var(--helix-color-series-19);
}

[part="tooltip-cell"][data-series="20"]::before {
background-color: var(--helix-color-series-20);
}

[part="tooltip-cell"][data-series="21"]::before {
background-color: var(--helix-color-series-21);
}

[part="tooltip-cell"][data-series="22"]::before {
background-color: var(--helix-color-series-22);
}

[part="tooltip-cell"][data-series="23"]::before {
background-color: var(--helix-color-series-23);
}

[part="tooltip-cell"][data-series="24"]::before {
background-color: var(--helix-color-series-24);
}

[part="guide"] {
stroke: var(--helix-color-foreground-muted);
stroke-dasharray: 3 3;
stroke-width: var(--helix-border-thin);
vector-effect: non-scaling-stroke;
}

[part="line"] {
stroke-dasharray: 1000;
transition:
d var(--helix-duration-normal) var(--helix-easing-decelerate),
stroke-dashoffset var(--helix-duration-slow) var(--helix-easing-decelerate);
}

@starting-style {
[part="line"] {
stroke-dashoffset: 1000;
}
}

[part="area"] {
transition:
d var(--helix-duration-normal) var(--helix-easing-decelerate),
opacity var(--helix-duration-slow) var(--helix-easing-decelerate);
}

@starting-style {
[part="area"] {
opacity: 0;
}
}

@media (prefers-reduced-motion: reduce) {
[part="line"],
[part="area"] {
transition: none;
}
}

[part="plot"] {
cursor: crosshair;
}

[part="gridline"] {
stroke: var(--line-chart-gridline-color, var(--helix-color-border));
stroke-width: var(--helix-border-thin);
vector-effect: non-scaling-stroke;
}

[part="band"] {
fill: var(--line-chart-band-color, var(--helix-color-surface-sunken));
}

@media print {
:host {
box-shadow: none;
print-color-adjust: exact;
}
}

:host([emphasis="subtle"]) [part="line"] {
stroke: color-mix(in oklab, var(--chart-series) 45%, var(--helix-color-background));
}

:host([emphasis="subtle"]) [part="area"] {
fill: color-mix(in oklab, var(--chart-series) 45%, var(--helix-color-background));
}

:host([emphasis="outlined"]) {
--line-chart-area-opacity: 0.08;
}

:host([emphasis="solid"]) {
--line-chart-area-opacity: 1;
}

:host([material="glass"]) [part="line"] {
stroke-opacity: calc(0.62 * var(--helix-material-opacity));
}

:host([material="frosted"]) [part="line"] {
stroke-opacity: calc(0.88 * var(--helix-material-opacity));
}`);var qY=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},W4=class W extends zJ{static{this.tier="helix-"}static{this.styles=[lJ,Y4,qX]}};qY([q({reflect:!0})],W4.prototype,"emphasis",void 0);qY([q({reflect:!0})],W4.prototype,"material",void 0);W4=qY([G("helix-line-chart")],W4);var K4=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},s7=class W extends A{constructor(){super(...arguments);this.href="",this.target="",this.rel=""}willUpdate(J){super.willUpdate(J),L(this.internals,{role:"listitem"})}renderRail(){return z}render(){let J=F`${this.renderRail()}<slot name="start"></slot>
      <slot></slot>
      <slot name="supporting"></slot>
      <slot name="end"></slot>`;return this.href===""?F`<div part="row">${J}</div>`:F`<a
          part="row"
          href=${this.href}
          target=${this.target||z}
          rel=${this.rel||z}
          >${J}</a
        >`}};K4([q()],s7.prototype,"href",void 0);K4([q()],s7.prototype,"target",void 0);K4([q()],s7.prototype,"rel",void 0);s7=K4([G("helix-headless-list-item")],s7);var Q4=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},a7=class W extends A{constructor(){super(...arguments);this.label=""}willUpdate(J){super.willUpdate(J),L(this.internals,{label:this.label,role:"list"})}render(){return F`<slot></slot>`}};Q4([q()],a7.prototype,"label",void 0);Q4([q({reflect:!0})],a7.prototype,"kind",void 0);Q4([q({reflect:!0})],a7.prototype,"type",void 0);a7=Q4([G("helix-headless-list")],a7);var GX=N(`:host {
display: block;
}

[part="row"] {
align-items: center;
display: grid;

grid-template-columns: auto auto 1fr auto;
padding: var(--list-item-inset, var(--helix-space-sm) var(--helix-space-md));
}

[part="rail"] {
align-self: start;
color: var(--helix-color-foreground-muted);
display: var(--list-item-rail-display, none);
font-family: var(--helix-font-mono);
font-size: var(--helix-text-xs);
grid-column: 1;
grid-row: 1;
letter-spacing: var(--helix-tracking-wide);
line-height: calc(var(--helix-text-sm) * var(--helix-leading-normal));
width: var(--list-rail-width, var(--helix-space-3xl));
}

[part="rail"]::before {
content: var(--list-item-rail-content, "");
}

slot[name="start"]::slotted(*) {
color: var(--helix-color-foreground-muted);
grid-column: 2;
margin-inline-end: var(--helix-space-sm);
grid-row: 1 / span 2;
}

slot:not([name]) {
color: var(--helix-color-foreground);
display: block;
font-size: var(--helix-text-sm);

font-weight: var(--list-item-term-weight, var(--helix-weight-regular));
grid-column: 3;
grid-row: 1;
}

slot[name="supporting"] {
color: var(--helix-color-foreground-muted);
display: block;
font-size: var(--helix-text-xs);
grid-column: 3;
grid-row: 2;
}

slot:not([name])::slotted(*),
slot[name="supporting"]::slotted(*) {
margin: var(--helix-space-none);
}

slot[name="end"]::slotted(*) {
grid-column: 4;
grid-row: 1 / span 2;
}

a[part="row"] {
color: inherit;
text-decoration: none;
}`);var zV=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},zX=class W extends s7{static{this.styles=GX}renderRail(){return F`<span part="rail"></span>`}};zX=zV([G("helix-list-item")],zX);var VX=N(`:host {
display: flex;
flex-direction: column;
gap: var(--list-gap, var(--helix-space-none));
}

:host([divided]) ::slotted(*:not(:first-child)) {
border-block-start: var(--helix-border-thin) solid var(--helix-color-border);
}

:host([kind="ordered"]),
:host([kind="unordered"]) {

padding-inline-start: var(--list-marker-gutter, var(--helix-space-md));
}

:host([kind="ordered"]) ::slotted(*),
:host([kind="unordered"]) ::slotted(*) {
display: list-item;
list-style-position: outside;
}

:host([kind="ordered"]) ::slotted(*) {
list-style-type: decimal;
}

:host([kind="ordered"][type="a"]) ::slotted(*) {
list-style-type: lower-alpha;
}

:host([kind="ordered"][type="A"]) ::slotted(*) {
list-style-type: upper-alpha;
}

:host([kind="ordered"][type="i"]) ::slotted(*) {
list-style-type: lower-roman;
}

:host([kind="ordered"][type="I"]) ::slotted(*) {
list-style-type: upper-roman;
}

:host([kind="unordered"]) ::slotted(*) {
list-style-type: disc;
}

:host([marker="rail"]) {
counter-reset: list-rail;

padding-inline-start: var(--helix-space-none);
}

:host([marker="rail"]) ::slotted(*) {
--list-item-rail-content: counter(list-rail, var(--list-rail-style, decimal-leading-zero));

--list-item-rail-display: block;
counter-increment: list-rail;
}

:host([kind="ordered"][marker="rail"]) ::slotted(*),
:host([kind="unordered"][marker="rail"]) ::slotted(*) {
display: block;
list-style: none;
}

:host([kind="description"]) ::slotted(*) {
--list-item-term-weight: var(--helix-weight-semibold);
}

@media print {
:host {
box-shadow: none;
}
}`);var GY=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},X4=class W extends a7{constructor(){super(...arguments);this.divided=!1}static{this.styles=VX}};GY([q({reflect:!0,type:Boolean})],X4.prototype,"divided",void 0);GY([q({reflect:!0})],X4.prototype,"marker",void 0);X4=GY([G("helix-list")],X4);var FX=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},I9=class W extends A{constructor(){super(...arguments);this.label="Loading"}willUpdate(J){super.willUpdate(J),L(this.internals,{label:this.label,role:"progressbar"}),this.internals.ariaBusy="true"}render(){return F`<svg part="svg" viewBox="0 0 24 24" aria-hidden="true">
        <circle part="track" cx="12" cy="12" r="10" fill="none" />
        <circle part="indicator" cx="12" cy="12" r="10" fill="none" />
      </svg>
      <span part="mark" aria-hidden="true"><slot></slot></span>`}};FX([q()],I9.prototype,"label",void 0);I9=FX([G("helix-headless-loader")],I9);var NX=N(`:host {
color: inherit;

display: inline-grid;
flex-shrink: 0;
place-items: center;
vertical-align: middle;

--_loader-size: var(--helix-size-loader-md);
}

:host([size="sm"]) {
--_loader-size: var(--helix-size-loader-sm);
}

:host([size="lg"]) {
--_loader-size: var(--helix-size-loader-lg);
}

[part="svg"] {
animation: helix-loader-turn 0.8s linear infinite;
grid-area: 1 / 1;
block-size: var(--loader-size, var(--_loader-size));
inline-size: var(--loader-size, var(--_loader-size));
}

[part="track"] {
animation: helix-loader-breathe 2.4s ease-in-out infinite;
opacity: 0.18;
stroke: var(--loader-track-color, currentColor);
stroke-width: 2;
}

[part="mark"] {
animation: helix-loader-breathe-mark 2.4s ease-in-out infinite;
}

@keyframes helix-loader-breathe {
0%,
100% {
opacity: 0.12;
}

50% {
opacity: 0.24;
}
}

@keyframes helix-loader-breathe-mark {
0%,
100% {
opacity: 0.45;
scale: 0.82;
}

50% {
opacity: 1;
scale: 1;
}
}

[part="indicator"] {
stroke: var(--loader-color, currentColor);
stroke-dasharray: 50, 100;
stroke-linecap: round;
stroke-width: 2;
}

@keyframes helix-loader-turn {
to {
transform: rotate(1turn);
}
}

@media (prefers-reduced-motion: reduce) {
[part="track"],
[part="mark"] {
animation: none;
}
}

@media (prefers-reduced-motion: reduce) {
[part="svg"] {
animation-duration: calc(var(--helix-duration-slow) * 12);
}
}

[part="mark"] {

--_mark-size: calc(var(--loader-size, var(--_loader-size)) * 0.4);
--icon-size: var(--_mark-size);

align-items: center;
block-size: var(--_mark-size);
display: flex;
grid-area: 1 / 1;
inline-size: var(--_mark-size);
justify-content: center;
}

[part="mark"] ::slotted(*) {
block-size: 100%;
inline-size: 100%;
}

:host([variant="pulse"]) [part="indicator"] {
display: none;
}

:host([variant="pulse"]) [part="svg"] {
animation: none;
}

:host([variant="pulse"]) {
--_loader-size: calc(var(--helix-size-loader-lg) * 2);
}

:host([variant="pulse"][size="sm"]) {
--_loader-size: var(--helix-size-loader-lg);
}

:host([variant="pulse"][size="lg"]) {
--_loader-size: calc(var(--helix-size-loader-lg) * 3);
}

:host([variant="pulse"]) [part="track"] {
display: none;
}

:host([variant="pulse"]) [part="mark"] {
animation-name: helix-loader-pulse-mark;
}

@keyframes helix-loader-pulse-mark {
0%,
100% {
opacity: 0.35;
}

50% {
opacity: 1;
}
}

@media (prefers-reduced-motion: reduce) {

:host([variant="pulse"]) [part="mark"] {
animation: none;
opacity: 1;
}
}

@media print {
:host {
display: none;
}
}`);var zY=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},$4=class W extends I9{static{this.styles=NX}};zY([q({reflect:!0})],$4.prototype,"variant",void 0);zY([q({reflect:!0})],$4.prototype,"size",void 0);$4=zY([G("helix-loader")],$4);var z5=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},q4,n1,VJ=class W extends g(A){constructor(){super(...arguments);this.label="",this.openOn="hover",this.fullBelow=640,this.narrow=!1,this.handleWidth=(J)=>{this.narrow=J.matches},this.panel=new d(this,{anchor:()=>this.trigger,boundary:()=>this,onDismiss:()=>this.close(),place:()=>!this.banded,placement:()=>"bottom-start",surface:()=>this.renderRoot?.querySelector('[part="surface"]')}),this.handleScroll=()=>{if(!this.open||!this.banded)return;if(this.bar()<=0){this.requestOpen(!1);return}this.band()},this.handlePointerDown=(J)=>{this.pointer=J.pointerType},this.handlePointerEnter=(J)=>{if(this.openOn!=="hover"||J.pointerType!=="mouse")return;this.schedule(n1&&n1!==this?0:q4.OPEN_DELAY,()=>{this.requestOpen(!0)})},this.handlePointerLeave=(J)=>{if(this.openOn!=="hover"||J.pointerType!=="mouse")return;this.schedule(q4.CLOSE_DELAY,()=>{this.requestOpen(!1)})},this.handleTriggerClick=(J)=>{if(this.stop(),this.openOn!=="hover"){this.requestOpen(!this.open);return}if(J.detail===0||this.pointer!==void 0&&this.pointer!=="mouse")this.requestOpen(!this.open)},this.handleContentClick=(J)=>{if(!this.open||J.defaultPrevented||J.button!==0)return;if(J.altKey||J.ctrlKey||J.metaKey||J.shiftKey)return;let K=J.target?.closest?.('a[href], button:not([disabled]), [role="menuitem"]');if(!K||!this.contains(K)||K.closest('[slot="trigger"]'))return;this.requestOpen(!1)}}static{q4=this}get banded(){return this.variant==="full"||this.narrow}watchWidth(){if(this.query?.removeEventListener("change",this.handleWidth),this.query=void 0,!(this.fullBelow>0)||typeof matchMedia!=="function"){this.narrow=!1;return}this.query=matchMedia(`(max-width: ${this.fullBelow-0.02}px)`),this.query.addEventListener("change",this.handleWidth),this.handleWidth(this.query)}get slotted(){return this.renderRoot?.querySelector('slot[name="trigger"]')?.assignedElements({flatten:!1})[0]}get trigger(){return D1(this.renderRoot?.querySelector('slot[name="trigger"]'),this.renderRoot?.querySelector('[part="trigger"]')??this)}close(){if(!this.requestOpen(!1))return;this.trigger.focus()}band(){if(!this.banded)return;this.style.setProperty("--megamenu-top",`${Math.round(this.bar())}px`)}bar(){let J=document.documentElement.clientWidth,Z=this.parentElement;while(Z&&Z!==document.body){let K=Z.getBoundingClientRect();if(Math.round(K.width)>=J)return K.bottom;Z=Z.parentElement}return this.trigger.getBoundingClientRect().bottom}static{this.OPEN_DELAY=120}static{this.CLOSE_DELAY=220}schedule(J,Z){this.stop(),this.timer=setTimeout(Z,J)}stop(){if(this.timer!==void 0)clearTimeout(this.timer),this.timer=void 0}connectedCallback(){super.connectedCallback(),this.watchWidth(),addEventListener("scroll",this.handleScroll,{capture:!0,passive:!0}),this.addEventListener("pointerdown",this.handlePointerDown),this.addEventListener("click",this.handleContentClick),this.addEventListener("pointerenter",this.handlePointerEnter),this.addEventListener("pointerleave",this.handlePointerLeave)}disconnectedCallback(){if(super.disconnectedCallback(),removeEventListener("scroll",this.handleScroll,{capture:!0}),this.query?.removeEventListener("change",this.handleWidth),this.query=void 0,this.removeEventListener("pointerdown",this.handlePointerDown),this.removeEventListener("click",this.handleContentClick),this.removeEventListener("pointerenter",this.handlePointerEnter),this.removeEventListener("pointerleave",this.handlePointerLeave),this.stop(),n1===this)n1=void 0}updated(J){if(super.updated?.(J),J.has("fullBelow"))this.watchWidth();this.toggleAttribute("data-narrow",this.narrow);let Z=this.slotted;if(Z)Z.setAttribute("aria-controls","panel"),Z.setAttribute("aria-expanded",this.open?"true":"false");if(this.open){if(n1&&n1!==this)n1.requestOpen(!1);n1=this,this.panel.show(),this.band()}else{if(n1===this)n1=void 0;this.panel.hide()}}renderTrigger(){return F`<slot name="trigger" @click=${this.handleTriggerClick}>
      <button
        part="trigger"
        type="button"
        aria-controls="panel"
        aria-expanded=${this.open?"true":"false"}
      >
        ${this.label}
      </button>
    </slot>`}render(){return F`${this.renderTrigger()}
      <div
        part="surface"
        id="panel"
        popover="manual"
        aria-label=${this.label||z}
        role="group"
        ?hidden=${!this.open}
      >
        <slot></slot>
      </div>`}};z5([q()],VJ.prototype,"label",void 0);z5([q({reflect:!0})],VJ.prototype,"variant",void 0);z5([q({attribute:"open-on"})],VJ.prototype,"openOn",void 0);z5([q({attribute:"full-below",type:Number})],VJ.prototype,"fullBelow",void 0);z5([U()],VJ.prototype,"narrow",void 0);VJ=q4=z5([G("helix-headless-megamenu")],VJ);var OX=N(`:host {
display: inline-flex;
}

[part="trigger"] {
all: unset;
box-sizing: border-box;

align-items: center;
border-radius: var(--helix-radii-sm);
color: var(--helix-color-foreground-muted);
cursor: pointer;
display: inline-flex;
font-family: var(--helix-font-sans);
font-size: var(--helix-text-sm);
font-weight: var(--helix-weight-medium);
gap: var(--helix-space-2xs);
min-block-size: var(--helix-size-control-sm);
padding-inline: var(--helix-space-xs);
transition:
background-color var(--helix-duration-fast) var(--helix-easing-standard),
color var(--helix-duration-fast) var(--helix-easing-standard);
}

[part="trigger"]:hover {
color: var(--helix-color-foreground);
}

[part="trigger"]:focus-visible {
outline: var(--helix-size-focus-ring) solid var(--helix-color-focus-ring);
outline-offset: var(--helix-size-focus-offset);
}

[part="trigger"][aria-expanded="true"] {
background-color: color-mix(in oklab, var(--helix-color-foreground) 8%, transparent);
color: var(--helix-color-foreground);
}

[part="surface"] {

backdrop-filter: var(--megamenu-backdrop, none);
background-color: var(--megamenu-background, var(--helix-color-background));

border: var(--megamenu-border-width, var(--helix-border-thin)) solid
light-dark(transparent, var(--helix-color-border));
border-radius: var(--helix-radii-md);
box-shadow: var(--megamenu-shadow, var(--helix-shadow-floating));
box-sizing: border-box;

clip-path: inset(0 calc(var(--helix-space-xl) * -1) 100% calc(var(--helix-space-xl) * -1));

display: grid;
gap: var(--helix-space-xl);
grid-auto-columns: minmax(var(--megamenu-column-size, 15rem), 1fr);
grid-auto-flow: column;

inline-size: max-content;
margin: var(--helix-space-none);

max-inline-size: min(var(--megamenu-size, 52rem), calc(100% - var(--helix-space-xl) * 2));
padding: var(--helix-space-md);

transition:
clip-path var(--helix-duration-slow) var(--helix-easing-decelerate),
display var(--helix-duration-slow) allow-discrete,
overlay var(--helix-duration-slow) allow-discrete;
}

[part="surface"]:popover-open {
clip-path: inset(
0 calc(var(--helix-space-xl) * -1) calc(var(--helix-space-xl) * -1)
calc(var(--helix-space-xl) * -1)
);
}

@starting-style {
[part="surface"]:popover-open {
clip-path: inset(0 calc(var(--helix-space-xl) * -1) 100% calc(var(--helix-space-xl) * -1));
}
}

:host([variant="full"]) [part="surface"],
:host([data-narrow]) [part="surface"] {

backdrop-filter: var(--megamenu-backdrop, none);
background-color: var(--megamenu-background, var(--helix-color-background));

border: none;
border-radius: var(--helix-radii-none);
box-shadow: var(--helix-shadow-md);

clip-path: inset(0 0 100% 0);

display: grid;
grid-auto-flow: row;
grid-template-columns: repeat(auto-fit, minmax(var(--megamenu-column-size, 15rem), 1fr));
inline-size: auto;
inset-block-start: var(--megamenu-top, 100%);
inset-inline: 0;
max-inline-size: none;

padding-block: var(--helix-space-md) var(--helix-space-xl);

padding-inline: max(var(--helix-space-xl), calc((100% - var(--megamenu-full-size, 80rem)) / 2));
position: fixed;
}

:host([variant="full"]) [part="surface"]:popover-open,
:host([data-narrow]) [part="surface"]:popover-open {
clip-path: inset(0 0 calc(var(--helix-space-xl) * -1) 0);
}

@starting-style {
:host([variant="full"]) [part="surface"]:popover-open,
:host([data-narrow]) [part="surface"]:popover-open {
clip-path: inset(0 0 100% 0);
}
}

:host([data-narrow]) [part="surface"] {
grid-auto-flow: row;
grid-template-columns: 1fr;

max-block-size: calc(100dvh - var(--megamenu-top, 0px) - var(--helix-space-xl));
overflow-y: auto;
overscroll-behavior: contain;
padding-inline: var(--helix-space-md);
}

:host [part="surface"][hidden] {
display: none;
}

@media (prefers-reduced-motion: reduce) {
[part="trigger"] {
transition: none;
}

[part="surface"] {
clip-path: none;
transition:
display var(--helix-duration-instant) allow-discrete,
overlay var(--helix-duration-instant) allow-discrete;
}
}

@media print {
:host {
display: none;
}
}`);var VV=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},BX=class W extends VJ{static{this.styles=OX}};BX=VV([G("helix-megamenu")],BX);var Q1=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},L0=class W extends A{constructor(){super(...arguments);this.value="",this.checkable=!1,this.checked=!1,this.disabled=!1,this.href="",this.target="",this.rel="",this.download=!1,this.onPage=!0,this.showingSubmenu=!1,this.isMenuItem=!0,this.submenu=!1,this.readSubmenu=()=>{let J=this.renderRoot.querySelector('slot[name="submenu"]');this.submenu=(J?.assignedElements().length??0)>0},this.handleClick=()=>{this.choose()},this.handleKeydown=(J)=>{if(J.key!=="Enter"&&J.key!==" ")return;let Z=this.renderRoot.querySelector('a[part="item"]');if(Z&&J.key==="Enter")return;if(J.preventDefault(),Z){Z.click();return}this.handleClick()}}get hasSubmenu(){return this.submenu}firstUpdated(J){super.firstUpdated(J),this.readSubmenu()}focus(){this.renderRoot.querySelector('[part="item"]')?.focus()}focusItem(){this.focus()}select(){this.choose()}get selected(){return this.ownerDocument.activeElement===this}choose(){if(this.disabled)return;this.dispatchEvent(new m({value:this.value}))}render(){if(this.showingSubmenu)return F`<slot name="submenu" @slotchange=${this.readSubmenu}></slot>`;if(!this.onPage)return z;let J=this.hasSubmenu,Z=this.href!==""&&!this.disabled,K=this.checkable||this.checked?"menuitemcheckbox":"menuitem",Q=this.checkable||this.checked?this.checked?"true":"false":z,Y=F`<span part="start"><slot name="start"></slot></span>
        <slot></slot>
        ${J?F`<svg
                part="mark"
                data-submenu
                fill="currentColor"
                viewBox=${O0.viewBox}
                aria-hidden="true"
              >
                ${S(O0.content)}
              </svg>`:this.checked?F`<svg
                  part="mark"
                  fill="currentColor"
                  viewBox=${JJ.viewBox}
                  aria-hidden="true"
                >
                  ${S(JJ.content)}
                </svg>`:F`<span part="mark" aria-hidden="true"></span>`}`;return F`${Z?F`<a
            part="item"
            href=${this.href}
            target=${this.target||z}
            rel=${this.rel||z}
            ?download=${this.download}
            role=${K}
            aria-checked=${Q}
            aria-haspopup=${J?"menu":z}
            tabindex="-1"
            @click=${this.handleClick}
            @keydown=${this.handleKeydown}
          >${Y}</a>`:F`<div
            part="item"
            role=${K}
            aria-checked=${Q}
            aria-disabled=${this.disabled?"true":z}
            aria-haspopup=${J?"menu":z}
            tabindex=${this.disabled?z:"-1"}
            @click=${this.handleClick}
            @keydown=${this.handleKeydown}
          >${Y}</div>`}
      <slot name="submenu" @slotchange=${this.readSubmenu}></slot>`}};Q1([q()],L0.prototype,"value",void 0);Q1([q({reflect:!0,type:Boolean})],L0.prototype,"checkable",void 0);Q1([q({reflect:!0,type:Boolean})],L0.prototype,"checked",void 0);Q1([q({reflect:!0,type:Boolean})],L0.prototype,"disabled",void 0);Q1([q()],L0.prototype,"href",void 0);Q1([q()],L0.prototype,"target",void 0);Q1([q()],L0.prototype,"rel",void 0);Q1([q({type:Boolean})],L0.prototype,"download",void 0);Q1([q({attribute:!1})],L0.prototype,"onPage",void 0);Q1([q({attribute:!1})],L0.prototype,"showingSubmenu",void 0);Q1([U()],L0.prototype,"submenu",void 0);L0=Q1([G("helix-headless-menu-item")],L0);var T9=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},J7=class W extends z0(g(A)){constructor(){super(...arguments);this.placement="bottom-start",this.offset=4,this.label="Menu",this.backLabel="Back",this.drilldown=new E8(this,{isRow:(J)=>("isMenuItem"in J)&&J.isMenuItem===!0,root:()=>[...this.children].filter((J)=>J.slot!=="trigger"),slot:"submenu"}),this.keys=new b0(this,{items:()=>this.items,reserved:()=>["ArrowLeft","ArrowRight"],selects:()=>!1}),this.panel=new d(this,{anchor:()=>this.trigger,boundary:()=>this,offset:()=>this.offset,onDismiss:()=>this.hide(),placement:()=>this.placement,surface:()=>this.renderRoot?.querySelector('[part="surface"]')}),this.handleSelect=(J)=>{let Z=J.target;if(!this.items.includes(Z))return;let K=Z;if(K.hasSubmenu){J.stopPropagation(),this.enter(K);return}this.hide()},this.handleFocusIn=(J)=>{let Z=this.items.find((Q)=>Q.contains(J.target));if(!Z)return;let K=this.renderRoot.querySelector('[part="surface"]');R7(Z,{padding:4,...K?{scroller:K}:{}})},this.handleKeydown=(J)=>{let Z=this.items,K=Z.indexOf(document.activeElement);if(J.key==="Escape")J.stopPropagation(),this.leave();else if(J.key==="ArrowRight"&&Z[K]?.hasSubmenu)this.enter(Z[K]);else if(J.key==="ArrowLeft")this.leave();else if(J.key==="Tab"){this.hide();return}else return;J.preventDefault()},this.handleTriggerClick=()=>{if(this.open)this.hide();else this.show()}}get trigger(){return D1(this.renderRoot?.querySelector('slot[name="trigger"]'),this)}get items(){return this.drilldown.rows.filter((J)=>!J.disabled)}show(){if(this.open||!this.requestOpen(!0))return;this.updateComplete.then(()=>{this.items[0]?.focus()})}hide(){if(!this.open||!this.requestOpen(!1))return;if(this.panel.hide(),this.drilldown.reset(),this.contains(document.activeElement))this.trigger.focus()}enter(J){if(!this.drilldown.enter(J))return;this.updateComplete.then(()=>this.items[0]?.focusItem())}leave(){if(this.drilldown.atRoot){this.hide();return}let J=this.drilldown.page;this.drilldown.back(),this.updateComplete.then(()=>J?.focus())}connectedCallback(){super.connectedCallback(),this.addEventListener("helix-select",this.handleSelect,!0),this.addEventListener("keydown",this.handleKeydown),this.addEventListener("focusin",this.handleFocusIn)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("helix-select",this.handleSelect,!0),this.removeEventListener("keydown",this.handleKeydown),this.removeEventListener("focusin",this.handleFocusIn)}updated(J){if(super.updated(J),J.has("open"))if(this.open)this.panel.show();else this.panel.hide();for(let Z of this.children){let K=Z;if(K.isMenuItem!==!0)continue;this.mark(K,this.drilldown.atRoot)}}mark(J,Z){J.onPage=Z,J.showingSubmenu=J===this.drilldown.page;for(let K of J.children){let Q=K;if(Q.isMenuItem===!0&&K.slot==="submenu")this.mark(Q,J===this.drilldown.page)}}render(){return F`<slot name="trigger" @click=${this.handleTriggerClick}></slot>
      <div
        part="surface"
        popover="manual"
        role="menu"
        aria-busy=${this.loading?"true":z}
        aria-label=${this.label}
        data-drilled=${this.drilldown.atRoot?z:""}
        ?hidden=${!this.open}
      >
        ${this.drilldown.atRoot?z:F`<div part="header">
                <button
                  part="back"
                  type="button"
                  aria-label=${this.backLabel}
                  @click=${()=>this.leave()}
                >
                  <svg part="back-mark" fill="currentColor" viewBox=${N0.viewBox} aria-hidden="true">
                    ${S(N0.content)}
                  </svg>
                </button>
                <span part="title">${this.drilldown.label}</span>
              </div>`}
        <slot @slotchange=${(J)=>this.countRows(J)}></slot>
        ${this.renderStatus(this.hasRows)}
      </div>`}};T9([q()],J7.prototype,"placement",void 0);T9([q({type:Number})],J7.prototype,"offset",void 0);T9([q()],J7.prototype,"label",void 0);T9([q({attribute:"back-label"})],J7.prototype,"backLabel",void 0);J7=T9([G("helix-headless-menu")],J7);var AX=N(`:host {
display: block;
}

[part="item"] {
align-items: center;

text-decoration: none;

border-radius: var(--helix-radii-none);
color: var(--helix-color-foreground);
cursor: pointer;
display: grid;

font-size: var(--helix-text-xs);

font-weight: var(--helix-weight-medium);
gap: var(--helix-space-xs);

grid-template-columns:
var(--menu-item-start, var(--helix-size-icon))
minmax(0, 1fr)
var(--helix-size-icon);
min-block-size: var(--helix-size-control-sm);

padding-inline: var(--helix-space-sm);
transition: background-color var(--helix-duration-fast) var(--helix-easing-standard);
user-select: none;
}

[part="item"]:hover {
background-color: var(
--menu-item-hover-color,
color-mix(in oklab, var(--helix-color-foreground) 8%, transparent)
);
}

[part="item"]:focus-visible {
outline: var(--helix-size-focus-ring) solid var(--helix-color-focus-ring);
outline-offset: calc(var(--helix-size-focus-offset) * -1);
}

[part="item"][aria-disabled="true"] {
cursor: not-allowed;
opacity: 0.5;
}

[part="start"] {
--icon-size: var(--helix-size-icon-sm);

align-items: center;
color: var(--helix-color-foreground-subtle);
display: flex;
inline-size: var(--menu-item-start, var(--helix-size-icon));
justify-content: center;

min-block-size: var(--helix-size-icon);
}

[part="mark"] {
block-size: var(--helix-size-icon);
inline-size: var(--helix-size-icon);
}

svg[part="mark"] {
color: var(--helix-color-foreground-subtle);
}

:host([checked]) svg[part="mark"] {
color: var(--helix-color-foreground);
}

slot[name="submenu"] {
display: contents;
}

@media (prefers-reduced-motion: reduce) {
[part="item"] {
transition: none;
}
}

:host(:dir(rtl)) [part="mark"][data-submenu] {
scale: -1 1;
}`);var FV=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},DX=class W extends L0{static{this.styles=AX}};DX=FV([G("helix-menu-item")],DX);var PX=N(`:host {

display: contents;
}

[part="surface"] {

max-block-size: var(--menu-max-block-size, var(--floating-available-height, none));
overflow-y: auto;

--helix-size-control: var(--helix-size-control-sm);
--helix-size-icon: var(--helix-size-icon-sm);

background-color: var(--menu-background-color, var(--helix-color-surface-overlay));

border: var(--menu-border-width, var(--helix-border-floating)) solid
var(--menu-border-color, var(--helix-color-border));

border-radius: var(--helix-radii-sm);
box-shadow: var(--menu-shadow, var(--helix-shadow-floating));

inset: auto;
margin: var(--helix-space-none);
min-inline-size: var(--menu-min-inline-size, 12rem);

padding-block: var(--helix-space-xs);
padding-inline: var(--helix-space-none);
}

[part="surface"][hidden] {
display: none;
}

[part="surface"] {
opacity: 0;
--_travel: calc(var(--helix-space-2xs) * -1);
transform: translateY(var(--_travel));
scale: 0.96;
transition:
opacity var(--helix-duration-fast) var(--helix-easing-standard),
scale var(--helix-duration-fast) var(--helix-easing-emphasized),
transform var(--helix-duration-fast) var(--helix-easing-emphasized),
display var(--helix-duration-fast) allow-discrete,
overlay var(--helix-duration-fast) allow-discrete;
}

[part="surface"][data-placement^="top"] {
--_travel: var(--helix-space-2xs);
}

[part="surface"][data-placed] {
opacity: 1;
scale: 1;
transform: none;
}

[part="surface"][data-placement^="top"] {
transform-origin: var(--floating-arrow-x, 50%) 100%;
}

[part="surface"][data-placement^="bottom"] {
transform-origin: var(--floating-arrow-x, 50%) 0;
}

[part="surface"][data-placement^="left"] {
transform-origin: 100% var(--floating-arrow-y, 50%);
}

[part="surface"][data-placement^="right"] {
transform-origin: 0 var(--floating-arrow-y, 50%);
}

@media (prefers-reduced-motion: reduce) {
[part="surface"],
[part="surface"][data-placed] {
scale: 1;
transform: none;
transition: none;
}
}

[part="header"] {
align-items: center;
border-block-end: var(--helix-border-thin) solid var(--helix-color-border);
display: flex;
gap: var(--helix-space-2xs);
margin-block-end: var(--helix-space-2xs);

padding: var(--helix-space-2xs) var(--helix-space-xs) var(--helix-space-xs);
}

[part="back"] {
align-items: center;
background: none;
border: none;
border-radius: var(--helix-radii-sm);
color: var(--helix-color-foreground-muted);
cursor: pointer;
display: inline-flex;
justify-content: center;

block-size: calc(var(--helix-size-icon) + var(--helix-space-xs));
inline-size: calc(var(--helix-size-icon) + var(--helix-space-xs));
padding: var(--helix-space-none);
}

[part="back"] svg {
block-size: var(--helix-size-icon);
inline-size: var(--helix-size-icon);
}

[part="back"]:hover {
background-color: color-mix(in oklab, var(--helix-color-foreground) 8%, transparent);
color: var(--helix-color-foreground);
}

[part="back"]:focus-visible {
outline: var(--helix-size-focus-ring) solid var(--helix-color-focus-ring);
outline-offset: calc(var(--helix-size-focus-offset) * -1);
}

[part="title"] {
color: var(--helix-color-foreground);
font-size: var(--helix-text-xs);
font-weight: var(--helix-weight-medium);
}

::slotted(helix-divider) {
margin-block: var(--helix-space-2xs);
}

[part="surface"][data-drilled] slot::slotted(:not(helix-menu-item)) {
display: none;
}

:host(:dir(rtl)) [part="back"] svg {
scale: -1 1;
}

[part="empty"],
[part="loading"] {
color: var(--helix-color-foreground-subtle);
font-family: var(--helix-font-sans);
font-size: var(--helix-text-sm);
margin: var(--helix-space-none);
padding-block: var(--helix-space-md);
padding-inline: var(--helix-space-sm);
text-align: center;
}

:host([loading]) [part="surface"] {
opacity: 0.5;
}

@media print {
:host {
display: none;
}
}`);var NV=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},IX=class W extends J7{static{this.styles=PX}};IX=NV([G("helix-menu")],IX);var X1=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},M0=class W extends A{constructor(){super(...arguments);this.label="Meter",this.min=0,this.max=100,this.value=0,this.showValue=!1,this.valueText=""}get span(){let J=Number.isFinite(this.min)?this.min:0;return{max:Number.isFinite(this.max)&&this.max>J?this.max:J+1,min:J}}get reading(){let{max:J,min:Z}=this.span;return Math.min(J,Math.max(Z,Number.isFinite(this.value)?this.value:Z))}get fraction(){let{max:J,min:Z}=this.span;return(this.reading-Z)/(J-Z)}get ratio(){let{max:J,min:Z}=this.span;return((Number.isFinite(this.value)?this.value:Z)-Z)/(J-Z)}get beyond(){let{max:J,min:Z}=this.span,K=Number.isFinite(this.value)?this.value:Z;return K>J?"over":K<Z?"under":void 0}get thresholds(){let{max:J,min:Z}=this.span;if(this.low===void 0&&this.high===void 0)return;let K=Math.min(J,Math.max(Z,this.low??Z));return{high:Math.min(J,Math.max(K,this.high??J)),low:K}}get computedBand(){if(this.band)return this.band;let J=this.thresholds;if(!J)return;let{max:Z,min:K}=this.span,Q=Math.min(Z,Math.max(K,this.optimum??(J.low+J.high)/2)),Y=($)=>$<J.low?0:$>J.high?2:1,X=Math.abs(Y(this.reading)-Y(Q));return X===0?"good":X===1?"fair":"poor"}get text(){return this.valueText||`${Math.round(this.ratio*100)}%`}willUpdate(J){super.willUpdate(J);let{max:Z,min:K}=this.span;L(this.internals,{label:this.label,role:"meter"}),this.internals.ariaValueMin=String(K),this.internals.ariaValueMax=String(Z),this.internals.ariaValueNow=String(this.reading),this.internals.ariaValueText=this.valueText||(this.beyond?`${Math.round(this.ratio*100)}%`:null)}renderRound(){let J=this.thresholds,{max:Z,min:K}=this.span,Q=this.shape==="arc"?75:100,Y=(X)=>(X-K)/(Z-K)*Q;return F`<svg part="track" viewBox="0 0 100 100" aria-hidden="true">
      <circle part="groove" pathLength="100" style="--meter-sweep: ${Q}" />
      ${J?_`<circle
                part="tick"
                pathLength="100"
                style="--meter-along: ${Y(J.low)}"
              />
              <circle part="tick" pathLength="100" style="--meter-along: ${Y(J.high)}" />`:z}
      <circle
        part="indicator"
        pathLength="100"
        data-band=${this.computedBand??z}
        data-beyond=${this.beyond??z}
        style="--meter-along: ${this.fraction*Q}"
      />
    </svg>`}render(){let J=this.thresholds,{max:Z,min:K}=this.span,Q=(Y)=>`${(Y-K)/(Z-K)*100}%`;return F`${this.shape?this.renderRound():F`<div part="track">
            ${J?F`<span part="tick" style="--meter-at: ${Q(J.low)}"></span>
                    <span part="tick" style="--meter-at: ${Q(J.high)}"></span>`:z}
            <div
              part="indicator"
              data-band=${this.computedBand??z}
              data-beyond=${this.beyond??z}
              style="--meter-fraction: ${this.fraction}"
            ></div>
          </div>`}
      ${this.showValue?F`<span part="value">${this.text}</span>`:z}`}};X1([q()],M0.prototype,"label",void 0);X1([q({type:Number})],M0.prototype,"min",void 0);X1([q({type:Number})],M0.prototype,"max",void 0);X1([q({type:Number})],M0.prototype,"value",void 0);X1([q({type:Number})],M0.prototype,"low",void 0);X1([q({type:Number})],M0.prototype,"high",void 0);X1([q({type:Number})],M0.prototype,"optimum",void 0);X1([q()],M0.prototype,"band",void 0);X1([q({reflect:!0})],M0.prototype,"shape",void 0);X1([q({attribute:"show-value",reflect:!0,type:Boolean})],M0.prototype,"showValue",void 0);X1([q({attribute:"value-text"})],M0.prototype,"valueText",void 0);M0=X1([G("helix-headless-meter")],M0);var TX=N(`:host {
display: block;
}

:host([show-value]) {
align-items: center;
display: grid;
gap: var(--helix-space-sm);
grid-template-columns: 1fr auto;
}

[part="value"] {
color: var(--helix-color-foreground-muted);
font-family: var(--helix-font-sans);
font-size: var(--helix-text-xs);
font-variant-numeric: tabular-nums;
min-inline-size: 3ch;
text-align: end;
}

[part="track"] {
background-color: var(--meter-track-color, var(--helix-color-surface-sunken));
block-size: var(--meter-size, var(--helix-size-meter));

border-radius: var(--helix-radii-sm);
inline-size: 100%;

overflow: hidden;
position: relative;
}

[part="indicator"] {
background-color: var(--_meter-hue);

--_meter-hue: var(--meter-color, var(--helix-color-primary));
block-size: 100%;
border-radius: inherit;
inline-size: 100%;
scale: var(--meter-fraction, 0) 1;
transform-origin: left center;
transition:
background-color var(--helix-duration-normal) var(--helix-easing-standard),
scale var(--helix-duration-normal) var(--helix-easing-decelerate);
}

:host(:dir(rtl)) [part="indicator"] {
transform-origin: right center;
}

[part="indicator"][data-band="good"] {
background-color: var(--_meter-hue);

--_meter-hue: var(--meter-color, var(--helix-color-success));
}

[part="indicator"][data-band="fair"] {
background-color: var(--_meter-hue);

--_meter-hue: var(--meter-color, var(--helix-color-warning));
}

[part="indicator"][data-band="poor"] {
background-color: var(--_meter-hue);

--_meter-hue: var(--meter-color, var(--helix-color-danger));
}

[part="indicator"][data-beyond="over"] {
border-end-end-radius: var(--helix-radii-none);
border-start-end-radius: var(--helix-radii-none);
}

[part="indicator"][data-beyond="under"] {
border-end-start-radius: var(--helix-radii-none);
border-start-start-radius: var(--helix-radii-none);
}

[part="tick"] {
background-color: var(--meter-tick-color, var(--helix-color-background));
block-size: 100%;
inline-size: var(--helix-border-thick);
inset-block-start: 0;
inset-inline-start: var(--meter-at, 0%);
position: absolute;

translate: -50%;
z-index: var(--helix-layer-raised);
}

@media (prefers-reduced-motion: reduce) {
[part="indicator"] {
transition: none;
}
}

:host([shape="arc"]),
:host([shape="ring"]) {
display: inline-grid;
place-items: center;
}

:host([shape="arc"]) [part="track"],
:host([shape="ring"]) [part="track"] {
--_meter-stroke: var(--meter-ring-width, var(--helix-size-progress));

background-color: transparent;
block-size: var(--meter-ring-size, 6rem);
border-radius: var(--helix-radii-none);
grid-area: 1 / 1;
inline-size: var(--meter-ring-size, 6rem);
}

:host([shape="ring"]) [part="track"] {
rotate: -90deg;
}

:host([shape="arc"]) [part="track"] {
rotate: 135deg;
}

:host([shape="arc"]) [part="groove"],
:host([shape="arc"]) [part="indicator"],
:host([shape="arc"]) [part="tick"],
:host([shape="ring"]) [part="groove"],
:host([shape="ring"]) [part="indicator"],
:host([shape="ring"]) [part="tick"] {
cx: 50%;
cy: 50%;
fill: none;
r: calc(50% - var(--_meter-stroke) / 2);
stroke-width: var(--_meter-stroke);
}

:host([shape="arc"]) [part="groove"],
:host([shape="ring"]) [part="groove"] {
stroke: var(--meter-track-color, var(--helix-color-surface-sunken));
stroke-dasharray: var(--meter-sweep) 100;
}

:host([shape="arc"]) [part="indicator"],
:host([shape="ring"]) [part="indicator"] {
scale: none;
stroke: var(--_meter-hue);

--_meter-hue: var(--helix-color-foreground-muted);
stroke-dasharray: var(--meter-along) 100;
stroke-linecap: round;
transition: stroke-dasharray var(--helix-duration-normal) var(--helix-easing-standard);
}

:host([shape="arc"]) [part="tick"],
:host([shape="ring"]) [part="tick"] {

inset-inline-start: auto;
position: static;
stroke: var(--meter-tick-color, var(--helix-color-background));
stroke-dasharray: 1 99;
stroke-dashoffset: calc(var(--meter-along) * -1);
}

:host([shape="arc"]) [part="indicator"][data-band="good"],
:host([shape="ring"]) [part="indicator"][data-band="good"] {
stroke: var(--_meter-hue);

--_meter-hue: var(--helix-color-success);
}

:host([shape="arc"]) [part="indicator"][data-band="fair"],
:host([shape="ring"]) [part="indicator"][data-band="fair"] {
stroke: var(--_meter-hue);

--_meter-hue: var(--helix-color-warning);
}

:host([shape="arc"]) [part="indicator"][data-band="poor"],
:host([shape="ring"]) [part="indicator"][data-band="poor"] {
stroke: var(--_meter-hue);

--_meter-hue: var(--helix-color-danger);
}

:host([shape="arc"]) [part="value"],
:host([shape="ring"]) [part="value"] {
grid-area: 1 / 1;
}

@media (prefers-reduced-motion: reduce) {
:host([shape="arc"]) [part="indicator"],
:host([shape="ring"]) [part="indicator"] {
transition: none;
}
}

@media print {
:host {
box-shadow: none;
print-color-adjust: exact;
}
}

:host([emphasis="subtle"]) [part="indicator"] {
background-color: color-mix(
in oklab,
var(--_meter-hue) 30%,
var(--meter-track-color, var(--helix-color-surface-sunken))
);
}

:host([emphasis="subtle"][shape="arc"]) [part="indicator"],
:host([emphasis="subtle"][shape="ring"]) [part="indicator"] {
stroke: color-mix(
in oklab,
var(--_meter-hue) 30%,
var(--meter-track-color, var(--helix-color-surface-sunken))
);
}`);var UX=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},VY=class W extends M0{static{this.styles=TX}};UX([q({reflect:!0})],VY.prototype,"emphasis",void 0);VY=UX([G("helix-meter")],VY);var CX=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},U9=class W extends A{constructor(){super(...arguments);this.indicator=new u1(this,{active:()=>this.items.find((J)=>J.getAttribute("aria-current")==="page"),indicator:()=>this.renderRoot?.querySelector('[part="indicator"]'),surface:()=>this.renderRoot?.querySelector('[part="nav"]')}),this.label="Main"}get items(){return this.renderRoot.querySelector("slot")?.assignedElements()??[]}watch(){this.observer?.disconnect(),this.current?.disconnect(),this.indicator.place(),this.observer=new ResizeObserver(()=>this.indicator.place()),this.observer.observe(this);for(let J of this.items)this.observer.observe(J);this.current=new MutationObserver(()=>this.indicator.place());for(let J of this.items)this.current.observe(J,{attributeFilter:["aria-current"]})}connectedCallback(){if(super.connectedCallback(),this.hasUpdated)this.watch()}disconnectedCallback(){super.disconnectedCallback(),this.observer?.disconnect(),this.current?.disconnect()}firstUpdated(J){super.firstUpdated(J),this.watch()}render(){return F`<nav part="nav" aria-label=${this.label}>
      <div part="indicator" aria-hidden="true"></div>
      <slot @slotchange=${()=>this.watch()}></slot>
    </nav>`}};CX([q()],U9.prototype,"label",void 0);U9=CX([G("helix-headless-navigation")],U9);var LX=N(`:host {
display: block;
}

[part="nav"] {
align-items: center;
block-size: var(--helix-size-control-sm);
display: flex;
gap: var(--navigation-gap, var(--helix-space-2xs));

min-inline-size: 0;
overflow-x: auto;

position: relative;
}

[part="indicator"] {
background-color: var(--navigation-indicator-color, var(--helix-color-surface-sunken));
block-size: var(--indicator-height, 0);
border-radius: var(--helix-radii-sm);
inline-size: var(--indicator-width, 0);
inset-block-start: 50%;
inset-inline-start: 0;
opacity: 0;
position: absolute;
translate: var(--indicator-x, 0) -50%;
transition:
translate var(--helix-duration-normal) var(--helix-easing-emphasized),
inline-size var(--helix-duration-normal) var(--helix-easing-emphasized),
opacity var(--helix-duration-fast) var(--helix-easing-standard);
z-index: var(--helix-layer-base);
}

[part="indicator"][data-placed] {
opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
[part="indicator"] {
transition: opacity var(--helix-duration-fast) var(--helix-easing-standard);
}
}

@media print {
:host {
display: none;
}
}`);var OV=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},MX=class W extends U9{static{this.styles=LX}};MX=OV([G("helix-navigation")],MX);var o7=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},L1=class W extends A{constructor(){super(...arguments);this.at="",this.defaultRead=!1,this.dismissible=!1,this.locale="",this.dismissLabel="Dismiss",this.isNotification=!0,this.readState=void 0,this.handleActions=()=>{this.markControls()},this.handleDismiss=(J)=>{if(J.stopPropagation(),this.dispatchEvent(new EJ({label:this.textContent?.trim()??""})))this.remove()}}get read(){return this.readState??this.defaultRead}set read(J){let Z=this.read;this.readState=J,this.requestUpdate("read",Z)}markRead(J=!0){if(J===this.read)return!1;return h({apply:(Z)=>{let K=this.read;this.readState=Z,this.requestUpdate("read",K)},event:(Z)=>new jJ({read:Z}),host:this,next:J})}willUpdate(J){super.willUpdate(J),L(this.internals,{role:"listitem"}),this.toggleState("read",this.read)}updated(J){super.updated(J),this.markControls()}markControls(){let J=this.renderRoot?.querySelector('slot[name="actions"]');this.toggleState("controls",this.dismissible||o(J))}renderDismiss(){if(!this.dismissible)return z;return T`<button
      part="dismiss"
      type="button"
      aria-label=${this.dismissLabel}
      @click=${this.handleDismiss}
    >
      <slot name="dismiss">
        <svg
          aria-hidden="true"
          data-glyph
          fill="currentColor"
          part="dismiss-mark"
          viewBox=${B0.viewBox}
        >
          ${S(B0.content)}
        </svg>
      </slot>
    </button>`}renderTime(){let J=this.tag("format-date");return T`<${J}
      exportparts="time"
      elapsed
      date=${this.at}
      locale=${this.locale}
    ></${J}>`}render(){return T`<div part="item">
      <span part="media"><slot name="media"></slot></span>
      <div part="body">
        <div part="label"><slot></slot></div>
        <slot name="caption"></slot>
      </div>
      <div part="trailing">
        ${this.renderTime()}
        <div part="controls">
          <span part="actions"><slot name="actions" @slotchange=${this.handleActions}></slot></span>
          ${this.renderDismiss()}
        </div>
      </div>
    </div>`}};o7([q()],L1.prototype,"at",void 0);o7([q({type:Boolean})],L1.prototype,"read",null);o7([q({attribute:"default-read",type:Boolean})],L1.prototype,"defaultRead",void 0);o7([q({type:Boolean})],L1.prototype,"dismissible",void 0);o7([q()],L1.prototype,"locale",void 0);o7([q({attribute:"dismiss-label"})],L1.prototype,"dismissLabel",void 0);L1=o7([G("helix-headless-notification")],L1);var G4=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},Z7=class W extends z0(A){constructor(){super(...arguments);this.label="",this.markAll=!1,this.markAllLabel="Mark all as read",this.handleSlotChange=()=>{this.assign(),this.requestUpdate()},this.handleRead=()=>{queueMicrotask(()=>this.requestUpdate())},this.handleMarkAll=()=>{this.markEveryoneRead()}}static{this.shadowRootOptions={...A.shadowRootOptions,slotAssignment:"manual"}}get unread(){return this.items.filter((J)=>!J.read).length}get items(){return[...this.children??[]].filter((J)=>("isNotification"in J)&&J.isNotification===!0)}markEveryoneRead(){if(!this.dispatchEvent(new jJ({read:!0})))return 0;let J=0;for(let Z of this.items)if(!Z.read&&Z.markRead(!0))J+=1;return this.requestUpdate(),J}assign(){let J=this.renderRoot,Z=J?.querySelector?.('slot[name="items"]');if(!Z?.assign)return;let K=this.items;Z.assign(...K);for(let Q of["header","footer"])J?.querySelector?.(`slot[name="${Q}"]`)?.assign?.(...[...this.children].filter((X)=>X.getAttribute("slot")===Q))}connectedCallback(){super.connectedCallback(),this.addEventListener("helix-read",this.handleRead)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("helix-read",this.handleRead)}willUpdate(J){super.willUpdate(J),L(this.internals,{label:this.label||"Notifications",role:"region"})}markMedia(){this.toggleState("media",this.items.some((J)=>J.querySelector(':scope > [slot="media"]')!==null))}markEmpty(){this.markRegion("header",["header"],'[part="mark-all"]'),this.markRegion("footer",["footer"])}markRegion(J,Z,K){let Q=this.renderRoot?.querySelector(`[part="${J}"]`),Y=!Z.some((X)=>o(this.renderRoot?.querySelector(`slot[name="${X}"]`)))&&!(K&&this.renderRoot?.querySelector(K));Q?.toggleAttribute("data-empty",Y),Q?.toggleAttribute("hidden",Y)}updated(J){super.updated(J),this.assign(),this.markEmpty(),this.markMedia();let Z=this.unread>0?String(this.unread):null;if(this.getAttribute("unread")!==Z)if(Z===null)this.removeAttribute("unread");else this.setAttribute("unread",Z)}render(){let J=this.items.length>0;return F`<div part="header">
        <slot name="header"></slot>
        ${this.markAll&&this.unread>0?F`<button part="mark-all" type="button" @click=${this.handleMarkAll}>
              ${this.markAllLabel}
            </button>`:z}
      </div>
      <div part="list" role="list" aria-busy=${this.loading?"true":z}>
        <slot name="items" @slotchange=${this.handleSlotChange}></slot>
        ${this.renderStatus(J)}
      </div>
      <div part="footer"><slot name="footer"></slot></div>`}};G4([q()],Z7.prototype,"label",void 0);G4([q({attribute:"mark-all",type:Boolean})],Z7.prototype,"markAll",void 0);G4([q({attribute:"mark-all-label"})],Z7.prototype,"markAllLabel",void 0);Z7=G4([G("helix-headless-notifications")],Z7);var SX=N(`:host {

--_notifications-line: calc(var(--helix-text-sm) * var(--helix-leading-normal));

container-type: inline-size;

display: block;
}

[part="item"] {
align-items: start;
border-block-end: var(--helix-border-thin) solid
var(--notifications-rule, var(--helix-color-border));
display: grid;
grid-template-columns: minmax(var(--notifications-media-column, 0px), auto) minmax(0, 1fr) auto;
padding-block: var(--notifications-padding-block, var(--helix-space-sm));
padding-inline: var(--notifications-padding-inline, var(--helix-space-md));

position: relative;
}

:host(:not(:state(read))) [part="item"]::before {
background-color: var(--notifications-unread-mark, var(--helix-color-accent));
block-size: var(--notifications-unread-block-size, var(--_notifications-line));
border-radius: var(--notifications-unread-radius, var(--helix-radii-full));
content: "";
inline-size: var(--notifications-unread-inline-size, var(--helix-border-thick));
inset-block-start: var(
--notifications-unread-offset,
var(--notifications-padding-block, var(--helix-space-sm))
);
inset-inline-start: var(--notifications-unread-inset, var(--helix-space-2xs));
position: absolute;
}

[part="media"] {
display: grid;
place-items: center start;
}

[part="body"] {
display: grid;
gap: var(--helix-space-2xs);
}

[part="label"] {
color: var(--notifications-color, var(--helix-color-foreground-muted));
font-family: var(--helix-font-sans);
font-size: var(--helix-text-sm);
line-height: var(--_notifications-line);
}

slot[name="caption"]::slotted(*) {
color: var(--helix-color-foreground-subtle);
font-family: var(--helix-font-sans);
font-size: var(--helix-text-xs);
line-height: var(--helix-leading-normal);
margin: var(--helix-space-none);
}

:host(:not(:state(read))) [part="label"] {
color: var(--helix-color-foreground);
font-weight: var(--helix-weight-medium);
}

[part="trailing"] {
align-items: center;
align-self: center;
display: grid;
grid-template-areas: "swap";
justify-items: end;
margin-inline-start: var(--helix-space-sm);
}

[part="trailing"] > * {
grid-area: swap;
transition: opacity var(--helix-duration-fast) var(--helix-easing-standard);
}

:host {
--_notifications-swap: 0;
}

[part="trailing"] > :not([part="controls"]) {
color: var(--helix-color-foreground-subtle);
font-family: var(--helix-font-sans);
font-size: var(--helix-text-xs);
opacity: calc(1 - var(--_notifications-swap));
}

[part="controls"] {
align-items: center;
display: flex;
opacity: var(--_notifications-swap);
}

:host(:hover:state(controls)),
:host(:focus-within:state(controls)) {
--_notifications-swap: 1;
}

[part="controls"] {
pointer-events: none;
}

:host(:hover:state(controls)) [part="controls"],
:host(:focus-within:state(controls)) [part="controls"] {
pointer-events: auto;
}

@media (hover: none) and (pointer: coarse) {
[part="trailing"] {
column-gap: var(--helix-space-sm);
grid-auto-flow: column;
grid-template-areas: none;
}

[part="trailing"] > * {
grid-area: auto;
opacity: 1;
}

[part="controls"] {
pointer-events: auto;
}
}

@media (prefers-reduced-motion: reduce) {
[part="trailing"] > * {
transition: none;
}
}

[part="actions"] {
align-items: center;
display: flex;
gap: var(--helix-space-2xs);
}

[part="dismiss"] {
background: none;
border: 0;
border-radius: var(--helix-radii-sm);
block-size: var(--helix-size-control);
color: var(--helix-color-foreground-muted);
cursor: pointer;
display: grid;
inline-size: var(--helix-size-control);
margin-inline-start: var(--helix-space-2xs);
padding: var(--helix-space-none);
place-items: center;
}

[part="dismiss"] ::slotted(*) {
block-size: var(--icon-size, var(--helix-size-icon));
inline-size: var(--icon-size, var(--helix-size-icon));
}

[part="dismiss"]:hover {
background-color: color-mix(in oklab, var(--helix-color-foreground) 8%, transparent);
color: var(--helix-color-foreground);
}

[part="dismiss"]:focus-visible {
outline: var(--helix-size-focus-ring) solid var(--helix-color-focus-ring);
outline-offset: var(--helix-size-focus-offset);
}

@media print {
[part="dismiss"] {
display: none;
}

:host(:not(:state(read))) [part="item"]::before {
display: none;
}
}

@container (inline-size < 26rem) {
[part="item"] {
grid-template-columns: minmax(var(--notifications-media-column, 0px), auto) minmax(0, 1fr);
}

[part="trailing"] {
align-self: start;
grid-column: 2;
grid-row: 2;
justify-items: start;
margin-block-start: var(--helix-space-2xs);
margin-inline-start: var(--helix-space-none);
}
}`);var BV=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},FY=class W extends L1{static{this.tier="helix-"}static{this.styles=[A0,SX]}};FY=BV([G("helix-notification")],FY);var RX=N(`:host {

--helix-size-checkbox: var(--helix-size-checkbox-sm);
--helix-size-control: var(--helix-size-control-sm);
--helix-size-icon: var(--helix-size-icon-sm);
--helix-size-tag: var(--helix-size-tag-sm);

display: grid;
grid-template-rows: auto minmax(0, 1fr) auto;
max-block-size: var(--notifications-max-height, none);
}

:host(:state(media)) {
--notifications-media-column: calc(var(--helix-size-avatar) + var(--helix-space-sm));
}

[part="header"] {
align-items: center;
border-block-end: var(--helix-border-thin) solid
var(--notifications-rule, var(--helix-color-border));
display: flex;
gap: var(--helix-space-sm);
justify-content: space-between;
padding-block: var(--helix-space-sm);
padding-inline: var(--notifications-padding-inline, var(--helix-space-md));
}

[part="header"][data-empty],
[part="footer"][data-empty] {
display: none;
}

[part="list"] {
overflow-y: auto;
}

[part="footer"] {
border-block-start: var(--helix-border-thin) solid
var(--notifications-rule, var(--helix-color-border));
padding-block: var(--helix-space-sm);
padding-inline: var(--notifications-padding-inline, var(--helix-space-md));
}

::slotted(helix-notification:last-of-type) {
--notifications-rule: transparent;
}

[part="mark-all"] {
background: none;
border: 0;
border-radius: var(--helix-radii-sm);
color: var(--helix-color-accent);
cursor: pointer;
font-family: var(--helix-font-sans);
font-size: var(--helix-text-sm);
padding-block: var(--helix-space-2xs);
padding-inline: var(--helix-space-2xs);
}

[part="mark-all"]:hover {
text-decoration: underline;
}

[part="mark-all"]:focus-visible {
outline: var(--helix-size-focus-ring) solid var(--helix-color-focus-ring);
outline-offset: var(--helix-size-focus-offset);
}

[part="empty"],
[part="loading"] {
color: var(--helix-color-foreground-subtle);
font-family: var(--helix-font-sans);
font-size: var(--helix-text-sm);
margin: var(--helix-space-none);
padding-block: var(--helix-space-lg);
padding-inline: var(--helix-space-md);
text-align: center;
}

@media print {
:host {
max-block-size: none;
}

[part="list"] {
overflow-y: visible;
}

[part="mark-all"] {
display: none;
}
}`);var AV=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},NY=class W extends Z7{static{this.tier="helix-"}static{this.styles=RX}};NY=AV([G("helix-notifications")],NY);var M1=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},DV=4,PV=16,y0=class W extends u(k(E)){constructor(){super(...arguments);this.announcesInput=!0,this.autocomplete="",this.step=1,this.placeholder="",this.readOnly=!1,this.scrub=!1,this.decrementLabel="Decrease",this.incrementLabel="Increase",this.scrubFrom=0,this.scrubValue=0,this.handleScrubDown=(J)=>{if(this.isDisabled||this.readOnly)return;J.currentTarget.setPointerCapture(J.pointerId),this.scrubFrom=J.clientX,this.scrubValue=this.numeric??this.min??0,J.preventDefault()},this.handleScrubMove=(J)=>{if(!J.currentTarget.hasPointerCapture(J.pointerId))return;let K=Math.abs(this.step)||1,Q=J.shiftKey?(this.largeStep??10)*K:K,Y=J.altKey?PV:DV,X=Math.round((J.clientX-this.scrubFrom)/Y),$=String(this.clamp(this.scrubValue+X*Q));if($===this.value)return;this.requestValue($);let V=this.control;if(V)Q0(V,this.value)},this.handleScrubEnd=(J)=>{let Z=J.currentTarget;if(Z.hasPointerCapture(J.pointerId))Z.releasePointerCapture(J.pointerId)},this.handleInput=(J)=>{J.stopPropagation();let Z=J.target;this.requestValue(Z.value),Q0(Z,this.value)},this.handleBlur=()=>{let J=this.control,Z=this.numeric;if(!J||Z===null)return;this.requestValue(String(this.clamp(Z))),Q0(J,this.value)},this.handleChange=(J)=>{J.stopPropagation(),this.dispatchEvent(new Event("change",{bubbles:!0,composed:!1}))},this.handleKeydown=(J)=>{if(J.key==="ArrowUp")this.stepUp();else if(J.key==="ArrowDown")this.stepDown();else if(J.key==="PageUp")this.stepUp(!0);else if(J.key==="PageDown")this.stepDown(!0);else if(J.key==="Home"&&this.min!==void 0&&!this.isDisabled&&!this.readOnly)this.requestValue(String(this.min));else if(J.key==="End"&&this.max!==void 0&&!this.isDisabled&&!this.readOnly)this.requestValue(String(this.max));else return;J.preventDefault()}}static{this.shadowRootOptions={...E.shadowRootOptions,delegatesFocus:!0}}get control(){return this.renderRoot.querySelector('[part="control"]')}get numeric(){if(this.value.trim()==="")return null;let J=Number(this.value);return Number.isFinite(J)?J:null}clamp(J){let Z=Math.abs(this.step)||1,K=this.min??0,Q=K+Math.round((J-K)/Z)*Z,Y=this.min===void 0?Q:Math.max(this.min,Q),X=this.max===void 0?Y:Math.min(this.max,Y),$=Math.max(EX(Z),EX(K));return Number(X.toFixed($))}nudge(J){if(this.isDisabled||this.readOnly)return;let Z=Math.abs(this.step)||1,K=this.numeric??this.min??0,Q=this.clamp(this.numeric===null?K:K+J*Z);this.requestValue(String(Q));let Y=this.control;if(Y)Q0(Y,this.value)}stepUp(J=!1){this.nudge(J?this.largeStep??10:1)}stepDown(J=!1){this.nudge(J?-(this.largeStep??10):-1)}renderLabel(){if(!this.scrub)return super.renderLabel();let J=this.label===""?this.getAttribute("aria-label"):null;if(this.label===""&&!J)return z;return F`<label
      part="label"
      for="control"
      ?data-hidden=${J!==null}
      @pointercancel=${this.handleScrubEnd}
      @pointerdown=${this.handleScrubDown}
      @pointermove=${this.handleScrubMove}
      @pointerup=${this.handleScrubEnd}
      ><slot name="label">${this.label||J}</slot></label
    >`}sync(){let J=this.control;if(this.internals.setFormValue(this.value),!J)return;let Z=this.numeric;if(this.required&&this.value.trim()==="")this.internals.setValidity({valueMissing:!0},"Please fill in this field.",J);else if(this.value.trim()!==""&&Z===null)this.internals.setValidity({badInput:!0},"Please enter a number.",J);else if(Z!==null&&this.min!==void 0&&Z<this.min)this.internals.setValidity({rangeUnderflow:!0},`Value must be ${this.min} or more.`,J);else if(Z!==null&&this.max!==void 0&&Z>this.max)this.internals.setValidity({rangeOverflow:!0},`Value must be ${this.max} or less.`,J);else this.internals.setValidity({},"",J);this.refreshFeedback()}focus(J){this.control?.focus(J)}select(){this.control?.select()}willUpdate(J){if(super.willUpdate(J),!this.hasUpdated)return;let Z=this.control;if(J.has("value")&&Z&&this.shadowRoot?.activeElement===Z)this.releaseCaret=S7(Z)}updated(J){super.updated(J),this.releaseCaret?.(),this.releaseCaret=void 0,this.sync()}render(){let J=this.numeric,Z=J!==null&&this.min!==void 0&&J<=this.min,K=J!==null&&this.max!==void 0&&J>=this.max;return F`${this.renderLabel()}
      <div part="field">
        <button
          part="decrement"
          type="button"
          aria-label=${this.decrementLabel}
          tabindex="-1"
          ?disabled=${this.isDisabled||this.readOnly||Z}
          @click=${()=>this.stepDown()}
        >
          <svg part="decrement-mark" fill="currentColor" viewBox=${E7.viewBox} aria-hidden="true">
            ${S(E7.content)}
          </svg>
        </button>
        <slot name="start"></slot>
        ${""}
        <input
          part="control"
          id="control"
          .value=${this.value}
          type="text"
          role="spinbutton"
          inputmode="decimal"
          autocomplete=${this.autocomplete||z}
          name=${this.name||z}
          placeholder=${this.placeholder||z}
          aria-describedby=${this.describedBy??z}
          aria-valuemin=${this.min??z}
          aria-valuemax=${this.max??z}
          aria-valuenow=${J??z}
          ?disabled=${this.isDisabled}
          ?readonly=${this.readOnly}
          ?required=${this.required}
          @blur=${this.handleBlur}
          @change=${this.handleChange}
          @input=${this.handleInput}
          @keydown=${this.handleKeydown}
        />
        <slot name="end"></slot>
        <button
          part="increment"
          type="button"
          aria-label=${this.incrementLabel}
          tabindex="-1"
          ?disabled=${this.isDisabled||this.readOnly||K}
          @click=${()=>this.stepUp()}
        >
          <svg part="increment-mark" fill="currentColor" viewBox=${w7.viewBox} aria-hidden="true">
            ${S(w7.content)}
          </svg>
        </button>
      </div>
      ${this.renderHint()}${this.renderFeedback()}`}get valueAsNumber(){return e5(this.value)}set valueAsNumber(J){this.value=J9(J)}};M1([q()],y0.prototype,"autocomplete",void 0);M1([q({type:Number})],y0.prototype,"min",void 0);M1([q({type:Number})],y0.prototype,"max",void 0);M1([q({type:Number})],y0.prototype,"step",void 0);M1([q({attribute:"large-step",type:Number})],y0.prototype,"largeStep",void 0);M1([q()],y0.prototype,"placeholder",void 0);M1([q({attribute:"read-only",reflect:!0,type:Boolean})],y0.prototype,"readOnly",void 0);M1([q({reflect:!0,type:Boolean})],y0.prototype,"scrub",void 0);M1([q({attribute:"decrement-label"})],y0.prototype,"decrementLabel",void 0);M1([q({attribute:"increment-label"})],y0.prototype,"incrementLabel",void 0);y0=M1([G("helix-headless-number-input")],y0);var EX=(W)=>{let J=String(W),Z=/e-(\d+)$/.exec(J);if(Z)return Number(Z[1]);return(J.split(".")[1]??"").length};var wX=N(`:host {
display: flex;
flex-direction: column;
gap: var(--helix-space-2xs);
}

[part="field"] {
align-items: center;
background-color: var(--helix-color-well);
block-size: var(--helix-size-control);
border: var(--helix-border-thin) solid var(--helix-color-border);
border-radius: var(--helix-radii-sm);
box-sizing: border-box;
display: flex;

overflow: hidden;
transition: border-color var(--helix-duration-fast) var(--helix-easing-standard);
}

:host(:not(:disabled)) [part="field"]:hover {
border-color: var(--helix-color-foreground-muted);
}

:host(:not(:disabled)) [part="field"]:focus-within {
border-color: var(--helix-color-primary);
outline: var(--helix-size-focus-ring) solid var(--helix-color-focus-ring);
outline-offset: var(--helix-size-focus-offset);
}

:host(:state(invalid)) [part="field"],
:host(:state(invalid)) [part="field"]:hover,
:host(:state(invalid):focus-within) [part="field"],
:host(:state(invalid):focus-within) [part="field"]:hover {
border-color: var(--helix-color-danger);
}

:host(:state(invalid):focus-within) [part="field"] {
outline-color: var(--helix-color-danger);
}

:host(:disabled) [part="field"] {
cursor: not-allowed;
opacity: 0.5;
}

:host([read-only]) [part="field"] {
background-color: transparent;
}

[part="control"] {
all: unset;

box-sizing: border-box;
color: var(--helix-color-foreground);
font-family: var(--helix-font-sans);
font-size: var(--helix-text-sm);
font-weight: var(--helix-weight-medium);
inline-size: 100%;
min-inline-size: 0;

font-variant-numeric: tabular-nums;
padding-inline: var(--helix-space-xs);
text-align: center;
}

slot[name="start"]::slotted(*),
slot[name="end"]::slotted(*) {
color: var(--helix-color-foreground-subtle);
flex: 0 0 auto;
}

slot[name="start"]::slotted(*) {
padding-inline-start: var(--helix-space-xs);
}

slot[name="end"]::slotted(*) {
padding-inline-end: var(--helix-space-xs);
}

[part="decrement"],
[part="increment"] {
all: unset;
align-items: center;
align-self: stretch;
box-sizing: border-box;
color: var(--helix-color-foreground-muted);
cursor: pointer;
display: flex;
flex: none;
inline-size: var(--helix-size-control);
justify-content: center;
transition:
background-color var(--helix-duration-fast) var(--helix-easing-standard),
color var(--helix-duration-fast) var(--helix-easing-standard);
}

[part="decrement"] {
border-inline-end: var(--helix-border-thin) solid var(--helix-color-border);
}

[part="increment"] {
border-inline-start: var(--helix-border-thin) solid var(--helix-color-border);
}

[part="decrement"]:hover:not(:disabled),
[part="increment"]:hover:not(:disabled) {
background-color: var(--helix-color-surface);
color: var(--helix-color-foreground);
}

[part="decrement"]:disabled,
[part="increment"]:disabled {
cursor: default;
opacity: 0.4;
}

[part="decrement"] svg,
[part="increment"] svg {
block-size: var(--helix-size-icon-sm);
inline-size: var(--helix-size-icon-sm);
}

@media (prefers-reduced-motion: reduce) {
[part="field"],
[part="decrement"],
[part="increment"] {
transition: none;
}
}

:host([scrub]) [part="label"] {
cursor: ew-resize;
touch-action: none;
user-select: none;
}

:host([scrub]:disabled) [part="label"],
:host([scrub][read-only]) [part="label"] {
cursor: default;
}

@media print {
:host {
box-shadow: none;
print-color-adjust: exact;
}
}`);var IV=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},bX=class W extends y0{static{this.styles=[y,l,wX]}};bX=IV([G("helix-number-input")],bX);var C9=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},Y7=class W extends A{constructor(){super(...arguments);this.indicator=new u1(this,{active:()=>this.links.find((J)=>J.hasAttribute("aria-current")),indicator:()=>this.renderRoot?.querySelector('[part="indicator"]'),surface:()=>this.renderRoot?.querySelector('[part="nav"]')}),this.label="On this page",this.offset=0,this.behavior="auto",this.reading="",this.frame=0,this.handleScroll=()=>{if(this.frame!==0)return;this.frame=globalThis.requestAnimationFrame(()=>{this.frame=0,this.mark()})},this.handleClick=(J)=>{if(J.defaultPrevented||J.button!==0)return;if(J.metaKey||J.ctrlKey||J.shiftKey||J.altKey)return;let Z=J.target?.closest?.('a[href^="#"]'),K=this.sections.find(($)=>$.link===Z);if(!K)return;this.landing=K,this.markTo(K),clearTimeout(this.landed);let Q=()=>{clearTimeout(this.landed),this.landing=void 0,globalThis.removeEventListener?.("scrollend",Q),this.mark()};if(globalThis.addEventListener?.("scrollend",Q,{once:!0}),this.landed=setTimeout(Q,1200),this.behavior==="auto")return;J.preventDefault();let Y=globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches===!0;K.target.scrollIntoView({behavior:Y&&this.behavior==="smooth"?"instant":this.behavior,block:"start"}),globalThis.history?.pushState(null,"",Z?.getAttribute("href")??"");let X=K.target;if(!X.hasAttribute("tabindex"))X.setAttribute("tabindex","-1");X.focus({preventScroll:!0})},this.handleSlotChange=()=>{this.watch(),this.indicator.place()}}get current(){return this.reading}get links(){return(this.renderRoot?.querySelector("slot")?.assignedElements({flatten:!0})??[]).filter((Z)=>Z instanceof HTMLAnchorElement&&Z.getAttribute("href")?.startsWith("#")===!0)}get sections(){let J=this.getRootNode();return this.links.flatMap((Z)=>{let K=decodeURIComponent(Z.getAttribute("href")?.slice(1)??""),Q=K?J.getElementById?.(K):null;return Q&&Q.getClientRects().length>0?[{link:Z,target:Q}]:[]})}mark(){if(this.landing)return;let J=this.sections;if(J.length===0)return;let Z=J.filter(({target:Q})=>Q.getBoundingClientRect().top-this.offset<=1),K=this.atEnd?J.at(-1):Z.at(-1)??J[0];this.markTo(K)}markTo(J){for(let{link:K,target:Q}of this.sections)if(Q===J?.target)K.setAttribute("aria-current","location");else K.removeAttribute("aria-current");let Z=J?.target.id??"";if(Z!==this.reading)this.reading=Z,this.dispatchEvent(new b1({value:Z}))}get atEnd(){let J=globalThis.document?.scrollingElement??globalThis.document?.documentElement;if(!J)return!1;return Math.ceil(J.scrollTop+J.clientHeight)>=J.scrollHeight-1}reach(){for(let{target:J}of this.sections){let Z=J;Z.style.scrollMarginBlockStart=this.offset>0?`${this.offset}px`:""}}watch(){if(this.observer?.disconnect(),this.sections.length===0){this.observer=void 0;return}this.observer=new IntersectionObserver(()=>this.mark(),{threshold:[0,0.25,0.5,0.75,1]});for(let{target:J}of this.sections)this.observer.observe(J);this.reach(),this.mark()}disconnectedCallback(){if(super.disconnectedCallback(),this.removeEventListener("click",this.handleClick),globalThis.removeEventListener?.("scroll",this.handleScroll),this.frame!==0)globalThis.cancelAnimationFrame(this.frame),this.frame=0;this.observer?.disconnect(),this.observer=void 0,this.resize?.disconnect(),this.resize=void 0,clearTimeout(this.landed),this.landed=void 0}connectedCallback(){if(super.connectedCallback(),this.addEventListener("click",this.handleClick),globalThis.addEventListener?.("scroll",this.handleScroll,{passive:!0}),this.hasUpdated)this.watch(),this.resize=new ResizeObserver(()=>this.indicator.place()),this.resize.observe(this)}firstUpdated(J){super.firstUpdated(J),this.watch(),this.resize=new ResizeObserver(()=>this.indicator.place()),this.resize.observe(this)}updated(J){if(super.updated(J),J.has("offset"))this.reach(),this.mark();if(!this.observer)this.watch();this.indicator.place()}render(){return F`<nav part="nav" aria-label=${this.label}>
      <slot @slotchange=${this.handleSlotChange}></slot>
      <span part="indicator" aria-hidden="true"></span>
    </nav>`}};C9([q()],Y7.prototype,"label",void 0);C9([q({type:Number})],Y7.prototype,"offset",void 0);C9([q()],Y7.prototype,"behavior",void 0);C9([U()],Y7.prototype,"reading",void 0);Y7=C9([G("helix-headless-outline")],Y7);var fX=N(`:host {
display: block;

--outline-rail: var(--helix-space-2xs);
}

[part="nav"] {
background-image: linear-gradient(var(--helix-color-border), var(--helix-color-border));

background-position: calc((var(--outline-rail) - var(--helix-border-thin)) / 2) 0;
background-repeat: repeat-y;
background-size: var(--helix-border-thin) 100%;
display: flex;
flex-direction: column;

position: relative;
}

[part="indicator"] {
--_mark-width: var(--helix-border-thin);

background-color: var(--helix-color-primary);
block-size: var(--indicator-height, 0);
border-radius: var(--helix-radii-full);
inline-size: var(--_mark-width);
inset-block-start: 0;
inset-inline-start: calc((var(--outline-rail) - var(--_mark-width)) / 2);
opacity: 0;
position: absolute;
translate: 0 var(--indicator-y, 0);

transition:
translate var(--helix-duration-normal) var(--helix-easing-spring),
block-size var(--helix-duration-slow) var(--helix-easing-decelerate),
inline-size var(--helix-duration-normal) var(--helix-easing-standard),
inset-inline-start var(--helix-duration-normal) var(--helix-easing-standard),
opacity var(--helix-duration-fast) var(--helix-easing-standard);
}

[part="indicator"][data-placed] {
opacity: 1;
}

:host(:hover) [part="indicator"]:not([data-moving]) {
--_mark-width: var(--helix-border-thick);
}

[part="indicator"][data-moving] {
--_mark-width: var(--outline-rail);

transition:
translate var(--helix-duration-normal) var(--helix-easing-spring),
block-size var(--helix-duration-slow) var(--helix-easing-decelerate),
inline-size var(--helix-duration-fast) var(--helix-easing-decelerate),
inset-inline-start var(--helix-duration-fast) var(--helix-easing-decelerate),
opacity var(--helix-duration-fast) var(--helix-easing-standard);
}

@media (prefers-reduced-motion: reduce) {
[part="indicator"],
[part="indicator"][data-moving] {
transition: opacity var(--helix-duration-fast) var(--helix-easing-standard);
}
}

::slotted(a) {
border-radius: var(--helix-radii-sm);
color: var(--helix-color-foreground-muted);

font-size: var(--helix-text-xs);

font-weight: var(--helix-weight-medium);
line-height: var(--helix-leading-normal);

margin-inline-start: var(--outline-rail, var(--helix-border-thick));
padding-block: var(--helix-space-2xs);
padding-inline: var(--helix-space-sm);
text-decoration: none;
transition:
background-color var(--helix-duration-fast) var(--helix-easing-standard),
color var(--helix-duration-fast) var(--helix-easing-standard);
}

::slotted(a):hover {
background-color: color-mix(in oklab, var(--helix-color-foreground) 5%, transparent);
color: var(--helix-color-foreground);
text-decoration: none;
}

::slotted(a[aria-current]) {
color: var(--helix-color-foreground);

font-weight: var(--helix-weight-semibold);
}

::slotted(a[data-level="2"]) {
padding-inline-start: calc(var(--helix-space-sm) + var(--outline-indent, var(--helix-space-sm)));
}

::slotted(a[data-level="3"]) {
padding-inline-start: calc(
var(--helix-space-sm) +
2 *
var(--outline-indent, var(--helix-space-sm))
);
}

::slotted(a[data-level="4"]) {
padding-inline-start: calc(
var(--helix-space-sm) +
3 *
var(--outline-indent, var(--helix-space-sm))
);
}

::slotted(a[data-level="5"]) {
padding-inline-start: calc(
var(--helix-space-sm) +
4 *
var(--outline-indent, var(--helix-space-sm))
);
}

::slotted(a[data-level="6"]) {
padding-inline-start: calc(
var(--helix-space-sm) +
5 *
var(--outline-indent, var(--helix-space-sm))
);
}

@media (prefers-reduced-motion: reduce) {
::slotted(a) {
transition: none;
}
}

@media print {
:host {
box-shadow: none;
}
}`);var TV=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},jX=class W extends Y7{static{this.styles=fX}};jX=TV([G("helix-outline")],jX);var W7=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},S1=class W extends u(k(E)){constructor(){super(...arguments);this.announcesInput=!0,this.autocomplete="one-time-code",this.length=6,this.type="numeric",this.mask=!1,this.placeholder="",this.readOnly=!1,this.cellLabel="Character {index} of {length}",this.handleInput=(J)=>{J.stopPropagation();let Z=J.target,K=this.cells.indexOf(Z);if(K===-1)return;if(Z.value===""){let Q=this.characters;Q[K]="",this.requestValue(Q.join("")),this.updateComplete.then(()=>{this.paint(),this.cells[K]?.focus()});return}this.write(K,Z.value),this.updateComplete.then(()=>this.paint())},this.handlePaste=(J)=>{let Z=J.target,K=this.cells.indexOf(Z);if(K===-1)return;J.preventDefault(),this.write(K,J.clipboardData?.getData("text")??"")},this.handleKeydown=(J)=>{let Z=J.target,K=this.cells.indexOf(Z);if(K===-1||this.isDisabled||this.readOnly)return;if(J.key==="Backspace"&&Z.value===""&&K>0){let Q=this.characters;Q[K-1]="",this.requestValue(Q.join("").replace(/\s+$/,"")),this.updateComplete.then(()=>{this.paint(),this.cells[K-1]?.focus()})}else if(J.key==="ArrowLeft"&&K>0)this.cells[K-1]?.focus(),this.cells[K-1]?.select();else if(J.key==="ArrowRight"&&K<this.count-1)this.cells[K+1]?.focus(),this.cells[K+1]?.select();else return;J.preventDefault()},this.committed="",this.handleFocus=(J)=>{J.target.select()},this.handleFocusOut=(J)=>{if(this.cells.includes(J.relatedTarget))return;if(this.value===this.committed)return;this.committed=this.value,this.dispatchEvent(new Event("change",{bubbles:!0,composed:!1}))}}static{this.shadowRootOptions={...E.shadowRootOptions,delegatesFocus:!0}}get count(){return Math.max(1,Math.floor(this.length)||1)}get cells(){return[...this.renderRoot.querySelectorAll('[part="cell"]')]}get characters(){return Array.from({length:this.count},(J,Z)=>this.value[Z]??"")}clean(J){let Z=J.trim();if(this.type==="numeric")return Z.replace(/\D/g,"");if(this.type==="alphanumeric")return Z.replace(/[^0-9A-Za-z]/g,"");return Z}write(J,Z){let K=this.clean(Z);if(K==="")return;let Q=Math.min(J,this.value.length),Y=this.characters;for(let V=0;V<K.length&&Q+V<this.count;V+=1)Y[Q+V]=K[V];let X=Y.join(""),$=Math.min(this.count-1,Q+K.length);this.requestValue(X),this.updateComplete.then(()=>{if(this.paint(),this.cells[$]?.focus(),this.cells[$]?.select(),X.length===this.count)this.dispatchEvent(new bJ({value:X})),this.committed=X,this.dispatchEvent(new Event("change",{bubbles:!0,composed:!1}))})}paint(){let J=this.characters;for(let[Z,K]of this.cells.entries()){let Q=J[Z]??"";if(K.value!==Q)K.value=Q}}sync(){this.internals.setFormValue(this.value);let J=this.cells[0];if(!J)return;if(this.required&&this.value==="")this.internals.setValidity({valueMissing:!0},"Please fill in this field.",J);else if(this.value!==""&&this.value.length<this.count)this.internals.setValidity({tooShort:!0},`Please enter all ${this.count} characters.`,J);else this.internals.setValidity({},"",J);this.refreshFeedback()}focus(J){let Z=this.cells,K=Math.min(this.value.length,Z.length-1);Z[K]?.focus(J)}clear(){this.requestValue(""),this.updateComplete.then(()=>{this.paint(),this.cells[0]?.focus()})}firstUpdated(J){super.firstUpdated(J),this.committed=this.value}updated(J){super.updated(J),this.paint(),this.sync()}render(){let J=this.characters;return F`${this.renderGroupLabel()}
      <div
        part="field"
        role="group"
        aria-describedby=${this.describedBy??z}
        @focusout=${this.handleFocusOut}
      >
        ${J.map((Z,K)=>F`<input
            part="cell"
            .value=${Z}
            type=${this.mask?"password":"text"}
            placeholder=${this.placeholder||z}
            inputmode=${this.type==="numeric"?"numeric":"text"}
            autocomplete=${K===0?this.autocomplete||z:"off"}
            aria-label=${this.cellLabel.replaceAll("{index}",String(K+1)).replaceAll("{length}",String(this.count))}
            ?disabled=${this.isDisabled}
            ?readonly=${this.readOnly}
            @focus=${this.handleFocus}
            @input=${this.handleInput}
            @keydown=${this.handleKeydown}
            @paste=${this.handlePaste}
          />`)}
      </div>
      ${this.renderHint()}${this.renderFeedback()}`}};W7([q()],S1.prototype,"autocomplete",void 0);W7([q({type:Number})],S1.prototype,"length",void 0);W7([q()],S1.prototype,"type",void 0);W7([q({reflect:!0,type:Boolean})],S1.prototype,"mask",void 0);W7([q()],S1.prototype,"placeholder",void 0);W7([q({attribute:"read-only",reflect:!0,type:Boolean})],S1.prototype,"readOnly",void 0);W7([q({attribute:"cell-label"})],S1.prototype,"cellLabel",void 0);S1=W7([G("helix-headless-pin-input")],S1);var _X=N(`:host {
display: flex;
flex-direction: column;
gap: var(--helix-space-2xs);
}

[part="field"] {
display: flex;
gap: var(--pin-input-gap, var(--helix-space-xs));
}

[part="cell"] {
all: unset;
background-color: var(--helix-color-well);
block-size: var(--helix-size-control);
border: var(--helix-border-thin) solid var(--helix-color-border);
border-radius: var(--helix-radii-sm);
box-sizing: border-box;
color: var(--helix-color-foreground);
font-family: var(--helix-font-sans);
font-size: var(--helix-text-lg);

font-variant-numeric: tabular-nums;
font-weight: var(--helix-weight-medium);
inline-size: var(--helix-size-control);
text-align: center;
transition: border-color var(--helix-duration-fast) var(--helix-easing-standard);
}

:host(:not(:disabled)) [part="cell"]:hover {
border-color: var(--helix-color-foreground-muted);
}

[part="cell"]:focus-visible {
border-color: var(--helix-color-primary);
outline: var(--helix-size-focus-ring) solid var(--helix-color-focus-ring);
outline-offset: var(--helix-size-focus-offset);
}

:host(:state(invalid)) [part="cell"] {
border-color: var(--helix-color-danger);
}

:host(:disabled) [part="cell"] {
cursor: not-allowed;
opacity: 0.5;
}

:host([read-only]) [part="cell"] {
background-color: transparent;
}

:host([mask]) [part="cell"] {
font-size: var(--helix-text-xl);
}

@media (prefers-reduced-motion: reduce) {
[part="cell"] {
transition: none;
}
}

[part="cell"]::placeholder {
color: var(--helix-color-foreground-subtle);
}

@media print {
:host {
box-shadow: none;
print-color-adjust: exact;
}
}`);var UV=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},vX=class W extends S1{static{this.styles=[y,l,_X]}};vX=UV([G("helix-pin-input")],vX);var z4=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},r7=class W extends g(A){constructor(){super(...arguments);this.label="Popover",this.offset=4,this.placement="bottom-start",this.panel=new d(this,{anchor:()=>this.trigger,boundary:()=>[this,this.invoker],offset:()=>this.offset,onDismiss:()=>this.hide(),placement:()=>this.placement,surface:()=>this.renderRoot?.querySelector('[part="popover"]')}),this.commands=new SJ(this,{commands:{"--close":()=>this.hide(),"--show":(J)=>{this.invoker=J instanceof HTMLElement?J:void 0,this.show()},"--toggle":(J)=>{if(this.invoker=J instanceof HTMLElement?J:void 0,this.open)this.hide();else this.show()}}}),this.handleTriggerClick=()=>{if(this.open)this.hide();else this.show()}}get trigger(){return this.invoker??D1(this.renderRoot?.querySelector('slot[name="trigger"]'),this)}show(){if(this.open||!this.requestOpen(!0))return}hide(){if(!this.open||!this.requestOpen(!1))return;if(this.panel.hide(),this.contains(L5()))this.trigger.focus()}updated(J){if(super.updated(J),!J.has("open"))return;if(this.open)this.panel.show();else this.panel.hide()}willUpdate(J){super.willUpdate(J)}render(){return F`<slot name="trigger" @click=${this.handleTriggerClick}></slot>
      <div
        part="popover"
        popover="manual"
        role="dialog"
        aria-label=${this.label}
        ?hidden=${!this.open}
      >
        <div part="content"><slot></slot></div>
      </div>`}};z4([q()],r7.prototype,"label",void 0);z4([q({type:Number})],r7.prototype,"offset",void 0);z4([q()],r7.prototype,"placement",void 0);r7=z4([G("helix-headless-popover")],r7);var kX=N(`:host {

display: contents;
}

[part="popover"] {
overflow: visible;
background-color: var(--helix-color-surface-overlay);

border: var(--popover-border-width, var(--helix-border-floating)) solid
var(--popover-border-color, var(--helix-color-border));

border-radius: var(--helix-radii-sm);
box-shadow: var(--popover-shadow, var(--helix-shadow-floating));
box-sizing: border-box;
color: var(--helix-color-foreground);

inset: auto;
margin: var(--helix-space-none);

max-inline-size: calc(100vw - var(--helix-space-lg));
padding: var(--popover-inset, var(--helix-space-md));
inline-size: var(--popover-inline-size, max-content);
}

[part="popover"]:not(:popover-open) {
display: none;
}

:host([separation="plain"]) [part="popover"] {
padding: var(--popover-inset, var(--helix-space-none));
}

[part="popover"] {
opacity: 0;
--_travel: calc(var(--helix-space-2xs) * -1);
transform: translateY(var(--_travel));
scale: var(--_popover-from, 0.96);
transition:
opacity var(--helix-duration-fast) var(--helix-easing-standard),
scale var(--helix-duration-fast) var(--helix-easing-emphasized),
transform var(--helix-duration-fast) var(--helix-easing-emphasized),
display var(--helix-duration-fast) allow-discrete,
overlay var(--helix-duration-fast) allow-discrete;
}

[part="popover"][data-placement^="top"] {
--_travel: var(--helix-space-2xs);
}

[part="popover"][data-placed] {
opacity: 1;
scale: 1;
transform: none;
}

[part="popover"][data-placement^="top"] {
transform-origin: var(--floating-arrow-x, 50%) 100%;
}

[part="popover"][data-placement^="bottom"] {
transform-origin: var(--floating-arrow-x, 50%) 0;
}

[part="popover"][data-placement^="left"] {
transform-origin: 100% var(--floating-arrow-y, 50%);
}

[part="popover"][data-placement^="right"] {
transform-origin: 0 var(--floating-arrow-y, 50%);
}

@media (prefers-reduced-motion: reduce) {
[part="popover"],
[part="popover"][data-placed] {
scale: 1;
transform: none;
transition: none;
}
}

[part="content"] {
max-block-size: var(--popover-max-block-size, var(--floating-available-height, none));
overflow: auto;
}

@media print {
:host {
display: none;
}
}`);var HX=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},OY=class W extends r7{static{this.styles=kX}};HX([q({reflect:!0})],OY.prototype,"separation",void 0);OY=HX([G("helix-popover")],OY);var K7=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},R1=class W extends A{constructor(){super(...arguments);this.label="Progress",this.indeterminate=!1,this.max=100,this.showValue=!1,this.value=0,this.valueText=""}get fraction(){let J=this.max>0?this.max:100;return Math.min(Math.max(this.value/J,0),1)||0}willUpdate(J){super.willUpdate(J),L(this.internals,{label:this.label,role:"progressbar"}),this.internals.ariaValueMin="0",this.internals.ariaValueMax=String(this.max>0?this.max:100);let Z=this.max>0?this.max:100;this.internals.ariaValueNow=this.indeterminate?null:String(Math.min(Math.max(this.value||0,0),Z)),this.internals.ariaValueText=this.valueText||null}render(){let J=this.indeterminate?1:this.fraction,Z=F`<svg part="track" aria-hidden="true">
      <circle part="groove" />
      <circle part="indicator" pathLength="100" style="--progress-fraction: ${J}" />
    </svg>`;return F`${this.shape==="ring"?Z:F`<div part="track">
            <div part="indicator" style="--progress-fraction: ${J}"></div>
          </div>`}
      ${this.showValue&&!this.indeterminate?F`<span part="value" aria-hidden="true"
              >${this.valueText||`${Math.round(this.fraction*100)}%`}</span
            >`:""}`}};K7([q()],R1.prototype,"label",void 0);K7([q({reflect:!0,type:Boolean})],R1.prototype,"indeterminate",void 0);K7([q({type:Number})],R1.prototype,"max",void 0);K7([q({reflect:!0})],R1.prototype,"shape",void 0);K7([q({attribute:"show-value",reflect:!0,type:Boolean})],R1.prototype,"showValue",void 0);K7([q({type:Number})],R1.prototype,"value",void 0);K7([q({attribute:"value-text"})],R1.prototype,"valueText",void 0);R1=K7([G("helix-headless-progress")],R1);var uX=N(`:host {
display: block;
}

:host([show-value]) {
align-items: center;
display: grid;
gap: var(--helix-space-sm);
grid-template-columns: 1fr auto;
}

[part="value"] {
color: var(--helix-color-foreground-muted);
font-family: var(--helix-font-sans);
font-size: var(--helix-text-xs);
font-variant-numeric: tabular-nums;
min-inline-size: 3ch;
text-align: end;
}

[part="track"] {
background-color: var(--progress-track-color, var(--helix-color-surface-sunken));
block-size: var(--progress-size, var(--helix-size-progress));
border-radius: var(--helix-radii-full);
inline-size: 100%;

overflow: hidden;
}

[part="indicator"] {
background-color: var(--progress-color, var(--helix-color-primary));
block-size: 100%;
border-radius: inherit;
inline-size: 100%;
scale: var(--progress-fraction, 0) 1;
transform-origin: left center;
transition: scale var(--helix-duration-normal) var(--helix-easing-decelerate);
}

:host(:dir(rtl)) [part="indicator"] {
transform-origin: right center;
}

@media (prefers-reduced-motion: reduce) {
[part="indicator"] {
transition: none;
}
}

:host([indeterminate]) {
--_progress-cycle: calc(var(--helix-duration-slow) * 5);
}

:host([indeterminate]) [part="indicator"] {
animation: helix-progress-indeterminate var(--_progress-cycle) linear infinite;

transition: none;
}

:host([indeterminate]) [part="indicator"] {
--_progress-way: 1;
}

:host([indeterminate]:dir(rtl)) [part="indicator"] {
--_progress-way: -1;
}

@keyframes helix-progress-indeterminate {
0% {
scale: 0.18 1;
translate: calc(-18% * var(--_progress-way, 1));
}

35% {
scale: 0.5 1;
translate: calc(12% * var(--_progress-way, 1));
}

65% {
scale: 0.5 1;
translate: calc(52% * var(--_progress-way, 1));
}

100% {
scale: 0.18 1;
translate: calc(100% * var(--_progress-way, 1));
}
}

@media (prefers-reduced-motion: reduce) {
:host([indeterminate]) [part="indicator"] {
animation: none;
background-image: repeating-linear-gradient(
-45deg,
var(--helix-color-background) 0 var(--helix-space-xs),
transparent var(--helix-space-xs) calc(var(--helix-space-xs) * 2)
);
scale: 1 1;
translate: 0;
}
}

:host([shape="ring"]) {
display: inline-grid;
place-items: center;
}

:host([shape="ring"]) [part="track"] {
--_ring-stroke: var(--progress-ring-width, var(--helix-size-progress));

background-color: transparent;
block-size: var(--progress-ring-size, 4rem);
grid-area: 1 / 1;
inline-size: var(--progress-ring-size, 4rem);

rotate: -90deg;
}

:host([shape="ring"]) [part="groove"],
:host([shape="ring"]) [part="indicator"] {
cx: 50%;
cy: 50%;
fill: none;
r: calc(50% - var(--_ring-stroke) / 2);
stroke-width: var(--_ring-stroke);
}

:host([shape="ring"]) [part="groove"] {
stroke: var(--progress-track-color, var(--helix-color-surface-sunken));
}

:host([shape="ring"]) [part="indicator"] {
scale: none;
stroke: var(--progress-color, var(--helix-color-primary));
stroke-dasharray: calc(var(--progress-fraction) * 100) 100;
stroke-linecap: round;
transition: stroke-dasharray var(--helix-duration-normal) var(--helix-easing-decelerate);
}

:host([shape="ring"][show-value]) {
gap: var(--helix-space-none);
grid-template-columns: auto;
}

:host([shape="ring"]) [part="value"] {
grid-area: 1 / 1;
min-inline-size: 0;
text-align: center;
}

:host([shape="ring"][indeterminate]) [part="track"] {
animation: helix-progress-ring var(--_progress-cycle) linear infinite;
}

:host([shape="ring"][indeterminate]) [part="indicator"] {
animation: helix-progress-ring-sweep calc(var(--_progress-cycle) * 0.7) ease-in-out infinite;
transition: none;
}

@keyframes helix-progress-ring {
from {
rotate: -90deg;
}

to {
rotate: 270deg;
}
}

@keyframes helix-progress-ring-sweep {
0% {
stroke-dasharray: 10 100;
stroke-dashoffset: 0;
}

50% {
stroke-dasharray: 70 100;
stroke-dashoffset: -25;
}

100% {
stroke-dasharray: 10 100;
stroke-dashoffset: -100;
}
}

@media (prefers-reduced-motion: reduce) {
:host([shape="ring"]) [part="indicator"] {
transition: none;
}

:host([shape="ring"][indeterminate]) [part="track"] {
animation-duration: calc(var(--_progress-cycle) * 12);
}

:host([shape="ring"][indeterminate]) [part="indicator"] {
animation: none;
stroke-dasharray: 25 100;
}
}

@media print {
:host {
box-shadow: none;
print-color-adjust: exact;
}
}

:host([emphasis="subtle"]) [part="indicator"] {
background-color: color-mix(
in oklab,
var(--progress-color, var(--helix-color-primary)) 30%,
var(--progress-track-color, var(--helix-color-surface-sunken))
);
}

:host([emphasis="subtle"][shape="ring"]) [part="indicator"] {
stroke: color-mix(
in oklab,
var(--progress-color, var(--helix-color-primary)) 30%,
var(--progress-track-color, var(--helix-color-surface-sunken))
);
}`);var hX=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},BY=class W extends R1{static{this.styles=uX}};hX([q({reflect:!0})],BY.prototype,"emphasis",void 0);BY=hX([G("helix-progress")],BY);var t7=((W)=>{return W[W.Border=-1]="Border",W[W.Data=0]="Data",W[W.Function=1]="Function",W[W.Position=2]="Position",W[W.Timing=3]="Timing",W[W.Alignment=4]="Alignment",W})(t7||{}),CV=[0,1],yX=[1,0],mX=[2,3],pX=[3,2],LV={L:CV,M:yX,Q:mX,H:pX},MV=/^\d*$/,SV=/^[A-Z0-9 $%*+./:-]*$/,AY="0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:",IY=1,TY=40,xX=3,RV=3,V4=40,EV=10,gX=[[-1,7,10,15,20,26,18,20,24,30,18,20,24,26,30,22,24,28,30,28,28,28,28,30,30,26,28,30,30,30,30,30,30,30,30,30,30,30,30,30,30],[-1,10,16,26,18,24,16,18,22,22,26,30,22,22,24,24,28,28,26,26,26,26,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28],[-1,13,22,18,26,18,24,18,22,20,24,28,26,24,20,30,24,28,28,26,30,28,30,30,30,30,28,30,30,30,30,30,30,30,30,30,30,30,30,30,30],[-1,17,28,22,16,22,28,26,26,24,28,24,28,22,24,24,30,28,28,26,28,30,24,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30]],nX=[[-1,1,1,1,1,1,2,2,2,2,4,4,4,4,4,6,6,6,6,7,8,8,9,9,10,12,12,12,13,14,15,16,17,18,19,19,20,21,22,24,25],[-1,1,1,1,2,2,4,4,4,5,5,5,8,9,9,10,10,11,13,14,16,17,17,18,20,21,23,25,26,28,29,31,33,35,37,38,40,43,45,47,49],[-1,1,1,2,2,4,4,6,6,8,8,8,10,12,16,12,17,16,18,21,20,23,23,25,27,29,34,34,35,38,40,43,45,48,51,53,56,59,62,65,68],[-1,1,1,2,4,4,4,5,6,8,8,11,11,16,16,18,16,19,21,25,25,25,34,30,32,35,37,40,42,45,48,51,54,57,60,63,66,70,74,77,81]];class lX{constructor(W,J,Z,K){if(this.version=W,this.ecc=J,W<IY||W>TY)throw new RangeError("Version value out of range");if(K<-1||K>7)throw new RangeError("Mask value out of range");this.size=W*4+17;let Q=Array.from({length:this.size}).fill(!1);for(let X=0;X<this.size;X++)this.modules.push(Q.slice()),this.types.push(Q.map(()=>0));this.drawFunctionPatterns();let Y=this.addEccAndInterleave(Z);if(this.drawCodewords(Y),K===-1){let X=1e9;for(let $=0;$<8;$++){this.applyMask($),this.drawFormatBits($);let V=this.getPenaltyScore();if(V<X)K=$,X=V;this.applyMask($)}}this.mask=K,this.applyMask(K),this.drawFormatBits(K)}size;mask;modules=[];types=[];getModule(W,J){return W>=0&&W<this.size&&J>=0&&J<this.size&&this.modules[J][W]}drawFunctionPatterns(){for(let Z=0;Z<this.size;Z++)this.setFunctionModule(6,Z,Z%2===0,t7.Timing),this.setFunctionModule(Z,6,Z%2===0,t7.Timing);this.drawFinderPattern(3,3),this.drawFinderPattern(this.size-4,3),this.drawFinderPattern(3,this.size-4);let W=this.getAlignmentPatternPositions(),J=W.length;for(let Z=0;Z<J;Z++)for(let K=0;K<J;K++)if(!(Z===0&&K===0||Z===0&&K===J-1||Z===J-1&&K===0))this.drawAlignmentPattern(W[Z],W[K]);this.drawFormatBits(0),this.drawVersion()}drawFormatBits(W){let J=this.ecc[1]<<3|W,Z=J;for(let Q=0;Q<10;Q++)Z=Z<<1^(Z>>>9)*1335;let K=(J<<10|Z)^21522;for(let Q=0;Q<=5;Q++)this.setFunctionModule(8,Q,FJ(K,Q));this.setFunctionModule(8,7,FJ(K,6)),this.setFunctionModule(8,8,FJ(K,7)),this.setFunctionModule(7,8,FJ(K,8));for(let Q=9;Q<15;Q++)this.setFunctionModule(14-Q,8,FJ(K,Q));for(let Q=0;Q<8;Q++)this.setFunctionModule(this.size-1-Q,8,FJ(K,Q));for(let Q=8;Q<15;Q++)this.setFunctionModule(8,this.size-15+Q,FJ(K,Q));this.setFunctionModule(8,this.size-8,!0)}drawVersion(){if(this.version<7)return;let W=this.version;for(let Z=0;Z<12;Z++)W=W<<1^(W>>>11)*7973;let J=this.version<<12|W;for(let Z=0;Z<18;Z++){let K=FJ(J,Z),Q=this.size-11+Z%3,Y=Math.floor(Z/3);this.setFunctionModule(Q,Y,K),this.setFunctionModule(Y,Q,K)}}drawFinderPattern(W,J){for(let Z=-4;Z<=4;Z++)for(let K=-4;K<=4;K++){let Q=Math.max(Math.abs(K),Math.abs(Z)),Y=W+K,X=J+Z;if(Y>=0&&Y<this.size&&X>=0&&X<this.size)this.setFunctionModule(Y,X,Q!==2&&Q!==4,t7.Position)}}drawAlignmentPattern(W,J){for(let Z=-2;Z<=2;Z++)for(let K=-2;K<=2;K++)this.setFunctionModule(W+K,J+Z,Math.max(Math.abs(K),Math.abs(Z))!==1,t7.Alignment)}setFunctionModule(W,J,Z,K=t7.Function){this.modules[J][W]=Z,this.types[J][W]=K}addEccAndInterleave(W){let J=this.version,Z=this.ecc;if(W.length!==F4(J,Z))throw new RangeError("Invalid argument");let K=nX[Z[0]][J],Q=gX[Z[0]][J],Y=Math.floor(DY(J)/8),X=K-Y%K,$=Math.floor(Y/K),V=[],O=uV(Q);for(let D=0,P=0;D<K;D++){let I=W.slice(P,P+$-Q+(D<X?0:1));P+=I.length;let C=hV(I,O);if(D<X)I.push(0);V.push(I.concat(C))}let B=[];for(let D=0;D<V[0].length;D++)V.forEach((P,I)=>{if(D!==$-Q||I>=X)B.push(P[D])});return B}drawCodewords(W){if(W.length!==Math.floor(DY(this.version)/8))throw new RangeError("Invalid argument");let J=0;for(let Z=this.size-1;Z>=1;Z-=2){if(Z===6)Z=5;for(let K=0;K<this.size;K++)for(let Q=0;Q<2;Q++){let Y=Z-Q,$=(Z+1&2)===0?this.size-1-K:K;if(!this.types[$][Y]&&J<W.length*8)this.modules[$][Y]=FJ(W[J>>>3],7-(J&7)),J++}}}applyMask(W){if(W<0||W>7)throw new RangeError("Mask value out of range");for(let J=0;J<this.size;J++)for(let Z=0;Z<this.size;Z++){let K;switch(W){case 0:K=(Z+J)%2===0;break;case 1:K=J%2===0;break;case 2:K=Z%3===0;break;case 3:K=(Z+J)%3===0;break;case 4:K=(Math.floor(Z/3)+Math.floor(J/2))%2===0;break;case 5:K=Z*J%2+Z*J%3===0;break;case 6:K=(Z*J%2+Z*J%3)%2===0;break;case 7:K=((Z+J)%2+Z*J%3)%2===0;break;default:throw new Error("Unreachable")}if(!this.types[J][Z]&&K)this.modules[J][Z]=!this.modules[J][Z]}}getPenaltyScore(){let W=0;for(let Q=0;Q<this.size;Q++){let Y=!1,X=0,$=[0,0,0,0,0,0,0];for(let V=0;V<this.size;V++)if(this.modules[Q][V]===Y){if(X++,X===5)W+=xX;else if(X>5)W++}else{if(this.finderPenaltyAddHistory(X,$),!Y)W+=this.finderPenaltyCountPatterns($)*V4;Y=this.modules[Q][V],X=1}W+=this.finderPenaltyTerminateAndCount(Y,X,$)*V4}for(let Q=0;Q<this.size;Q++){let Y=!1,X=0,$=[0,0,0,0,0,0,0];for(let V=0;V<this.size;V++)if(this.modules[V][Q]===Y){if(X++,X===5)W+=xX;else if(X>5)W++}else{if(this.finderPenaltyAddHistory(X,$),!Y)W+=this.finderPenaltyCountPatterns($)*V4;Y=this.modules[V][Q],X=1}W+=this.finderPenaltyTerminateAndCount(Y,X,$)*V4}for(let Q=0;Q<this.size-1;Q++)for(let Y=0;Y<this.size-1;Y++){let X=this.modules[Q][Y];if(X===this.modules[Q][Y+1]&&X===this.modules[Q+1][Y]&&X===this.modules[Q+1][Y+1])W+=RV}let J=0;for(let Q of this.modules)J=Q.reduce((Y,X)=>Y+(X?1:0),J);let Z=this.size*this.size,K=Math.ceil(Math.abs(J*20-Z*10)/Z)-1;return W+=K*EV,W}getAlignmentPatternPositions(){if(this.version===1)return[];else{let W=Math.floor(this.version/7)+2,J=this.version===32?26:Math.ceil((this.version*4+4)/(W*2-2))*2,Z=[6];for(let K=this.size-7;Z.length<W;K-=J)Z.splice(1,0,K);return Z}}finderPenaltyCountPatterns(W){let J=W[1],Z=J>0&&W[2]===J&&W[3]===J*3&&W[4]===J&&W[5]===J;return(Z&&W[0]>=J*4&&W[6]>=J?1:0)+(Z&&W[6]>=J*4&&W[0]>=J?1:0)}finderPenaltyTerminateAndCount(W,J,Z){if(W)this.finderPenaltyAddHistory(J,Z),J=0;return J+=this.size,this.finderPenaltyAddHistory(J,Z),this.finderPenaltyCountPatterns(Z)}finderPenaltyAddHistory(W,J){if(J[0]===0)W+=this.size;J.pop(),J.unshift(W)}}function NJ(W,J,Z){if(J<0||J>31||W>>>J!==0)throw new RangeError("Value out of range");for(let K=J-1;K>=0;K--)Z.push(W>>>K&1)}function FJ(W,J){return(W>>>J&1)!==0}class N4{constructor(W,J,Z){if(this.mode=W,this.numChars=J,this.bitData=Z,J<0)throw new RangeError("Invalid argument");this.bitData=Z.slice()}getData(){return this.bitData.slice()}}var wV=[1,10,12,14],bV=[2,9,11,13],fV=[4,8,16,16];function cX(W,J){return W[Math.floor((J+7)/17)+1]}function dX(W){let J=[];for(let Z of W)NJ(Z,8,J);return new N4(fV,W.length,J)}function jV(W){if(!iX(W))throw new RangeError("String contains non-numeric characters");let J=[];for(let Z=0;Z<W.length;){let K=Math.min(W.length-Z,3);NJ(Number.parseInt(W.substring(Z,Z+K),10),K*3+1,J),Z+=K}return new N4(wV,W.length,J)}function _V(W){if(!sX(W))throw new RangeError("String contains unencodable characters in alphanumeric mode");let J=[],Z;for(Z=0;Z+2<=W.length;Z+=2){let K=AY.indexOf(W.charAt(Z))*45;K+=AY.indexOf(W.charAt(Z+1)),NJ(K,11,J)}if(Z<W.length)NJ(AY.indexOf(W.charAt(Z)),6,J);return new N4(bV,W.length,J)}function vV(W){if(W==="")return[];else if(iX(W))return[jV(W)];else if(sX(W))return[_V(W)];else return[dX(HV(W))]}function iX(W){return MV.test(W)}function sX(W){return SV.test(W)}function kV(W,J){let Z=0;for(let K of W){let Q=cX(K.mode,J);if(K.numChars>=1<<Q)return Number.POSITIVE_INFINITY;Z+=4+Q+K.bitData.length}return Z}function HV(W){W=encodeURI(W);let J=[];for(let Z=0;Z<W.length;Z++)if(W.charAt(Z)!=="%")J.push(W.charCodeAt(Z));else J.push(Number.parseInt(W.substring(Z+1,Z+3),16)),Z+=2;return J}function DY(W){if(W<IY||W>TY)throw new RangeError("Version number out of range");let J=(16*W+128)*W+64;if(W>=2){let Z=Math.floor(W/7)+2;if(J-=(25*Z-10)*Z-55,W>=7)J-=36}return J}function F4(W,J){return Math.floor(DY(W)/8)-gX[J[0]][W]*nX[J[0]][W]}function uV(W){if(W<1||W>255)throw new RangeError("Degree out of range");let J=[];for(let K=0;K<W-1;K++)J.push(0);J.push(1);let Z=1;for(let K=0;K<W;K++){for(let Q=0;Q<J.length;Q++)if(J[Q]=PY(J[Q],Z),Q+1<J.length)J[Q]^=J[Q+1];Z=PY(Z,2)}return J}function hV(W,J){let Z=J.map((K)=>0);for(let K of W){let Q=K^Z.shift();Z.push(0),J.forEach((Y,X)=>Z[X]^=PY(Y,Q))}return Z}function PY(W,J){if(W>>>8!==0||J>>>8!==0)throw new RangeError("Byte out of range");let Z=0;for(let K=7;K>=0;K--)Z=Z<<1^(Z>>>7)*285,Z^=(J>>>K&1)*W;return Z}function xV(W,J,Z=1,K=40,Q=-1,Y=!0){if(!(IY<=Z&&Z<=K&&K<=TY)||Q<-1||Q>7)throw new RangeError("Invalid value");let X,$;for(X=Z;;X++){let D=F4(X,J)*8,P=kV(W,X);if(P<=D){$=P;break}if(X>=K)throw new RangeError("Data too long")}for(let D of[yX,mX,pX])if(Y&&$<=F4(X,D)*8)J=D;let V=[];for(let D of W){NJ(D.mode[0],4,V),NJ(D.numChars,cX(D.mode,X),V);for(let P of D.getData())V.push(P)}let O=F4(X,J)*8;NJ(0,Math.min(4,O-V.length),V),NJ(0,(8-V.length%8)%8,V);for(let D=236;V.length<O;D^=253)NJ(D,8,V);let B=Array.from({length:Math.ceil(V.length/8)},()=>0);return V.forEach((D,P)=>B[P>>>3]|=D<<7-(P&7)),new lX(X,J,B,Q)}function aX(W,J){let{ecc:Z="L",boostEcc:K=!1,minVersion:Q=1,maxVersion:Y=40,maskPattern:X=-1,border:$=1}=J||{},V=typeof W==="string"?vV(W):Array.isArray(W)?[dX(W)]:void 0;if(!V)throw new Error(`uqr only supports encoding string and binary data, but got: ${typeof W}`);let O=xV(V,LV[Z],Q,Y,X,K),B=yV({version:O.version,maskPattern:O.mask,size:O.size,data:O.modules,types:O.types},$);if(J?.invert)B.data=B.data.map((D)=>D.map((P)=>!P));return J?.onEncoded?.(B),B}function yV(W,J=1){if(!J)return W;let{size:Z}=W,K=Z+J*2;W.size=K,W.data.forEach((Y)=>{for(let X=0;X<J;X++)Y.unshift(!1),Y.push(!1)});for(let Y=0;Y<J;Y++)W.data.unshift(Array.from({length:K},(X)=>!1)),W.data.push(Array.from({length:K},(X)=>!1));let Q=t7.Border;W.types.forEach((Y)=>{for(let X=0;X<J;X++)Y.unshift(Q),Y.push(Q)});for(let Y=0;Y<J;Y++)W.types.unshift(Array.from({length:K},(X)=>Q)),W.types.push(Array.from({length:K},(X)=>Q));return W}var L9=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},oX=(W,J,Z)=>{let K=(Q,Y)=>Q<8&&Y<8;return K(W,J)||K(Z-1-W,J)||K(W,Z-1-J)},rX=(W,J,Z="all")=>{let K=W.length,Q=($,V)=>{if(!W[V]?.[$])return!1;if(Z==="all")return!0;return Z==="finders"?oX($,V,K):!oX($,V,K)},Y=[];if(J==="square"){for(let $=0;$<K;$+=1){let V=0;for(let O=0;O<=K;O+=1){if(Q(O,$)){V+=1;continue}if(V>0)Y.push(`M${O-V} ${$}h${V}v1h-${V}z`),V=0}}return Y.join("")}let X=J==="dots"?0.45:0.28;for(let $=0;$<K;$+=1)for(let V=0;V<K;V+=1){if(!Q(V,$))continue;if(J==="dots")Y.push(`M${V+0.5-X} ${$+0.5}a${X} ${X} 0 1 0 ${X*2} 0a${X} ${X} 0 1 0 ${-X*2} 0z`);else Y.push(`M${V+X} ${$}h${1-X*2}a${X} ${X} 0 0 1 ${X} ${X}v${1-X*2}a${X} ${X} 0 0 1 ${-X} ${X}h${-(1-X*2)}a${X} ${X} 0 0 1 ${-X} ${-X}v${-(1-X*2)}a${X} ${X} 0 0 1 ${X} ${-X}z`)}return Y.join("")},OJ=class W extends A{constructor(){super(...arguments);this.value="",this.label="",this.shape="square",this.logo=!1}get level(){return this.correction??(this.logo?"H":"M")}renderCode(){if(this.value==="")return z;let J=aX(this.value,{border:0,ecc:this.level}),Z=J.size,K=4,Q=Z+K*2,Y=rX(J.data,"square","finders");return _`<svg
      part="code"
      viewBox="0 0 ${Q} ${Q}"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label=${this.label||this.value}
      shape-rendering="crispEdges"
    >
      <path
        part="modules"
        d=${rX(J.data,this.shape,"body")}
        transform="translate(${K} ${K})"
        fill="currentColor"
      />
      <path
        part="finders"
        d=${Y}
        transform="translate(${K} ${K})"
        fill="currentColor"
      />
    </svg>`}render(){return F`${this.renderCode()}
    <span ?hidden=${!this.logo} part="logo">
      <slot
        name="logo"
        @slotchange=${(J)=>{let Z=J.target.assignedNodes().length>0;if(Z!==this.logo)this.logo=Z,this.requestUpdate()}}
      ></slot>
    </span>`}};L9([q()],OJ.prototype,"value",void 0);L9([q()],OJ.prototype,"label",void 0);L9([q()],OJ.prototype,"shape",void 0);L9([q({attribute:"correction"})],OJ.prototype,"correction",void 0);OJ=L9([G("helix-headless-qr-code")],OJ);var tX=N(`:host {
--_qr-size: var(--qr-code-size, 12rem);

background-color: var(--qr-code-background-color, var(--helix-color-foreground-media));
block-size: var(--_qr-size);
border-radius: var(--helix-radii-sm);
color: var(--qr-code-color, var(--helix-color-surface-media));
display: block;
inline-size: var(--_qr-size);
position: relative;
}

[part="code"] {
block-size: 100%;
display: block;
inline-size: 100%;
}

[part="finders"] {
fill: var(--qr-code-finder-color, currentColor);
}

[part="logo"] {
align-items: center;
background-color: var(--qr-code-background-color, var(--helix-color-surface-raised));
border-radius: var(--helix-radii-sm);

box-sizing: border-box;
display: flex;
inset-block-start: 50%;
inset-inline-start: 50%;
justify-content: center;
max-block-size: var(--qr-code-logo-size, 27%);
max-inline-size: var(--qr-code-logo-size, 27%);
min-block-size: var(--qr-code-logo-size, 27%);
min-inline-size: var(--qr-code-logo-size, 27%);
padding: var(--qr-code-logo-inset, 6%);
position: absolute;
translate: -50% -50%;
}

[part="logo"] slot::slotted(*) {
block-size: 100%;
inline-size: 100%;
object-fit: contain;
}

[part="logo"][hidden] {
display: none;
}

@media print {
:host {
box-shadow: none;
}
}`);var mV=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},UY=class W extends OJ{static{this.styles=tX}};UY=mV([G("helix-qr-code")],UY);var eX=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},M9=class W extends A{constructor(){super(...arguments);this.cite=""}render(){return F`<q part="quote" cite=${this.cite||z}><slot></slot></q>`}};eX([q()],M9.prototype,"cite",void 0);M9=eX([G("helix-headless-quote")],M9);var J$=N(`:host {
display: inline;
font: inherit;
}

[part="quote"] {

color: var(--quote-color, var(--helix-color-foreground-muted));
font: inherit;
font-style: italic;
}

@media print {
:host {
background-color: transparent;
box-shadow: none;
}
}`);var pV=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},Z$=class W extends M9{static{this.styles=J$}};Z$=pV([G("helix-quote")],Z$);var O4=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},BJ=class W extends A{constructor(){super(...arguments);this.disabled=!1,this.seeded=this.hasAttribute("selected"),this.selected=!1,this.value=""}get defaultSelected(){return this.seeded}set defaultSelected(J){this.seeded=J}focusItem(){this.renderRoot.querySelector('[part="item"]')?.focus()}select(){if(this.disabled)return;this.dispatchEvent(new m({value:this.value}))}willUpdate(J){super.willUpdate(J),this.toggleState("selected",this.selected)}render(){return F`<button
      part="item"
      type="button"
      role="radio"
      aria-checked=${this.selected?"true":"false"}
      ?disabled=${this.disabled}
      tabindex=${this.selected?"0":"-1"}
      @click=${()=>this.select()}
    >
      <span part="box"><span part="mark" aria-hidden="true"></span></span>
      <slot name="icon"></slot>
      <span part="label"><slot></slot></span>
    </button>`}};O4([q({reflect:!0,type:Boolean})],BJ.prototype,"disabled",void 0);O4([q({type:Boolean})],BJ.prototype,"selected",void 0);O4([q()],BJ.prototype,"value",void 0);BJ=O4([G("helix-headless-radio")],BJ);var Y$=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},S9=class W extends u(k(E)){constructor(){super(...arguments);this.keys=new b0(this,{items:()=>this.items}),this.cascade=new j1(this,{items:()=>this.items}),this.handleSelection=(J)=>{J.stopPropagation();let Z=J.detail.value;if(Z===this.value)return;this.requestValue(Z)}}get items(){return[...this.children].filter((J)=>J instanceof BJ)}place(){let J=this.items;for(let K of J)K.selected=K.value===this.value;let Z=this.value===""&&J.length>0?J[0]:void 0;for(let K of J)if(K===Z)K.setAttribute("tabindex","0");else K.removeAttribute("tabindex")}sync(){this.internals.setFormValue(this.value===""?null:this.value),this.reportRequired(this.value==="","Choose one to continue.","items")}connectedCallback(){super.connectedCallback(),this.addEventListener("helix-select",this.handleSelection)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("helix-select",this.handleSelection)}willUpdate(J){super.willUpdate(J),L(this.internals,{label:this.label,role:"radiogroup"}),this.internals.ariaRequired=this.required?"true":null}updated(J){super.updated(J),this.place(),this.sync(),this.linkHost()}render(){return F`${this.renderGroupLabel()}
      <div part="items">
        <slot @slotchange=${()=>this.place()}></slot>
      </div>
      ${this.renderHint()}${this.renderFeedback()}`}};Y$([q({reflect:!0})],S9.prototype,"orientation",void 0);S9=Y$([G("helix-headless-radio-group")],S9);var W$=N(`:host {
display: flex;
flex-direction: column;
gap: var(--helix-space-2xs);
}

[part="items"] {
display: flex;
flex-direction: column;
gap: var(--radio-group-gap, var(--helix-space-xs));
}

:host([orientation="horizontal"]) [part="items"] {
column-gap: var(--radio-group-gap, var(--helix-space-md));
flex-direction: row;
flex-wrap: wrap;
}

:host(:state(invalid)) [part="items"] {
--radio-border-color: var(--helix-color-danger);
}`);var gV=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},K$=class W extends S9{static{this.styles=[y,l,W$]}};K$=gV([G("helix-radio-group")],K$);var Q$=N(`:host {
display: block;

--_radio-size: var(--radio-size, var(--helix-size-checkbox));
}

[part="item"] {
all: unset;
align-items: center;
box-sizing: border-box;
cursor: pointer;
display: inline-flex;
gap: var(--helix-space-xs);
}

:host([disabled]) [part="item"] {
cursor: default;
}

:host([disabled]) {
opacity: 0.5;
}

[part="box"] {

background-color: var(--radio-background-color, var(--helix-color-background));
block-size: var(--_radio-size);
border: var(--helix-border-thin) solid var(--radio-border-color, var(--helix-color-border));

border-radius: var(--helix-radii-full);
display: grid;
flex: 0 0 auto;
inline-size: var(--_radio-size);
place-items: center;
transition: border-color var(--helix-duration-fast) var(--helix-easing-standard);
}

:host(:not([disabled])) [part="item"]:hover [part="box"] {
border-color: var(--radio-border-color, var(--helix-color-foreground-muted));
}

:host(:state(selected)) [part="box"] {
border-color: var(--radio-border-color, var(--helix-color-foreground));
}

[part="mark"] {
background-color: var(--radio-mark-color, var(--helix-color-foreground));
block-size: calc(var(--_radio-size) * 0.4);
border-radius: var(--helix-radii-full);
inline-size: calc(var(--_radio-size) * 0.4);

scale: 0;
transition: scale var(--helix-duration-fast) var(--helix-easing-emphasized);
}

:host(:state(selected)) [part="mark"] {
scale: 1;
}

[part="item"]:focus-visible [part="box"] {
outline: var(--helix-size-focus-ring) solid var(--helix-color-focus-ring);
outline-offset: var(--helix-size-focus-offset);
}

[part="label"] {
color: var(--helix-color-foreground);
font-family: var(--helix-font-sans);
font-size: var(--helix-text-sm);
font-weight: var(--helix-weight-medium);
line-height: var(--helix-leading-tight);
}

@media (prefers-reduced-motion: reduce) {
[part="mark"],
[part="box"] {
transition: none;
}
}

:host([variant="card"]) {
display: block;
}

:host([variant="card"]) [part="item"] {
align-items: start;
background-color: var(--radio-card-background-color, var(--helix-color-surface));
border: var(--helix-border-thin) solid var(--radio-card-border-color, var(--helix-color-border));
border-radius: var(--helix-radii-sm);
display: flex;
gap: var(--helix-space-sm);
inline-size: 100%;
padding: var(--radio-card-padding, var(--helix-space-md));
transition:
background-color var(--helix-duration-fast) var(--helix-easing-standard),
border-color var(--helix-duration-fast) var(--helix-easing-standard);
}

:host(:not([disabled])[variant="card"]) [part="item"]:hover {
border-color: var(--helix-color-foreground-muted);
}

:host([variant="card"]:state(selected)) [part="item"] {
background-color: var(--helix-color-surface-raised);
border-color: var(--helix-color-primary);
box-shadow: 0 0 0 var(--helix-border-thick) var(--helix-color-primary);
}

:host([variant="card"]) [part="item"]:focus-visible {
outline: var(--helix-size-focus-ring) solid var(--helix-color-focus-ring);
outline-offset: var(--helix-size-focus-offset);
}

:host([variant="card"]) [part="item"]:focus-visible [part="box"] {
outline: none;
}

:host([variant="card"]) [part="box"] {
margin-block-start: calc(
(var(--helix-text-sm) * var(--helix-leading-tight) - var(--_radio-size)) /
2
);
}

:host([variant="card"][hide-control]) [part="box"] {
display: none;
}

@media (prefers-reduced-motion: reduce) {
:host([variant="card"]) [part="item"] {
transition: none;
}
}

:host([variant="chip"]) [part="box"] {
display: none;
}

:host([variant="chip"]) [part="item"] {
align-items: center;
background-color: var(--helix-color-surface-sunken);
block-size: var(--radio-chip-size, var(--helix-size-control-md));
border-radius: var(--helix-radii-full);
color: var(--helix-color-foreground-muted);
cursor: pointer;
display: inline-flex;
inline-size: var(--radio-chip-size, var(--helix-size-control-md));
justify-content: center;
padding: 0;
transition:
background-color var(--helix-duration-fast) var(--helix-easing-standard),
box-shadow var(--helix-duration-fast) var(--helix-easing-standard),
translate var(--helix-duration-fast) var(--helix-easing-standard);
}

:host([variant="chip"]:state(selected)) [part="item"] {
background-color: var(--helix-color-surface-inverse);
box-shadow: var(--helix-shadow-md);
color: var(--helix-color-foreground-inverse);
translate: 0 -2px;
}

:host(:not([disabled])[variant="chip"]) [part="item"]:hover {
translate: 0 -1px;
}

:host([variant="chip"]) [part="item"]:focus-visible {
outline: var(--helix-size-focus-ring) solid var(--helix-color-focus-ring);
outline-offset: var(--helix-size-focus-offset);
}

:host([variant="chip"]) [part="label"] {
clip-path: inset(50%);
block-size: 1px;
inline-size: 1px;
overflow: hidden;
position: absolute;
white-space: nowrap;
}

@media (prefers-reduced-motion: reduce) {
:host([variant="chip"]) [part="item"] {
transition: none;
}

:host([variant="chip"]:state(selected)) [part="item"],
:host(:not([disabled])[variant="chip"]) [part="item"]:hover {
translate: none;
}
}

@media print {
:host {
box-shadow: none;
print-color-adjust: exact;
}
}`);var CY=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},B4=class W extends BJ{constructor(){super(...arguments);this.hideControl=!1}static{this.styles=Q$}};CY([q({reflect:!0})],B4.prototype,"variant",void 0);CY([q({attribute:"hide-control",reflect:!0,type:Boolean})],B4.prototype,"hideControl",void 0);B4=CY([G("helix-radio")],B4);var AJ=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},$1=class W extends u(k(E)){constructor(){super(...arguments);this.announcesInput=!1,this.max=5,this.min=0,this.step=1,this.readOnly=!1,this.valueText="",this.showValue=!1,this.markSource=void 0,this.previewing=void 0,this.keys=new b0(this,{items:()=>this.options,selects:()=>!0,wrap:!1}),this.dragging=void 0,this.clones=new Map,this.handleMarkSlot=(J)=>{this.clones.clear(),this.markSource=J.target.assignedElements({flatten:!0})[0]},this.handleDragStart=(J)=>{if(this.isDisabled||this.readOnly||J.button!==0)return;let Z=this.scoreAt(J.clientX);if(Z===void 0)return;try{J.currentTarget.setPointerCapture(J.pointerId)}catch{}this.dragging=J.pointerId,this.previewing=Number.parseFloat(Z)},this.handleDragMove=(J)=>{if(this.dragging!==J.pointerId)return;let Z=this.scoreAt(J.clientX);if(Z!==void 0)this.previewing=Number.parseFloat(Z)},this.handleDragEnd=(J)=>{if(this.dragging!==J.pointerId)return;this.dragging=void 0,this.previewing=void 0;let Z=this.scoreAt(J.clientX);if(Z!==void 0)this.requestValue(Z)},this.handleDragCancel=(J)=>{if(this.dragging!==J.pointerId)return;this.dragging=void 0,this.previewing=void 0},this.handleOptionClick=(J)=>{let Z=J.currentTarget;this.requestValue(Z.dataset.score??"")},this.handleOptionEnter=(J)=>{if(this.isDisabled)return;let Z=J.currentTarget;this.previewing=Number.parseFloat(Z.dataset.score??"")},this.handleLeave=()=>{this.previewing=void 0}}get score(){let J=Number.parseFloat(this.value);if(!Number.isFinite(J))return 0;return Math.min(Math.max(J,0),this.max)}get steps(){let J=Math.max(1,Math.round(this.max/this.step));return Array.from({length:J},(Z,K)=>Number(((K+1)*this.step).toFixed(2)))}get options(){return[...this.renderRoot?.querySelectorAll('[part="option"]')??[]].map((Z)=>({contains:(K)=>Z.contains(K),disabled:this.isDisabled||this.readOnly,focusItem:()=>Z.focus(),select:()=>{this.requestValue(Z.dataset.score??"")},selected:Z.getAttribute("aria-checked")==="true"}))}markFor(J,Z){if(!this.markSource)return;let K=`${J}:${Z}`,Q=this.clones.get(K);if(Q)return Q;let Y=this.markSource.cloneNode(!0);return this.clones.set(K,Y),Y}scoreAt(J){let Z,K=Number.POSITIVE_INFINITY;for(let Q of this.renderRoot?.querySelectorAll('[part="option"]')??[]){let Y=Q.getBoundingClientRect();if(J>=Y.left&&J<Y.right)return Q.dataset.score;let X=J<Y.left?Y.left-J:J-Y.right;if(X<K)K=X,Z=Q.dataset.score}return Z}sync(){this.internals.setFormValue(this.value),this.refreshFeedback()}connectedCallback(){super.connectedCallback(),this.addEventListener("pointerleave",this.handleLeave)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("pointerleave",this.handleLeave)}updated(J){if(super.updated?.(J),J.has("value"))this.sync()}firstUpdated(J){super.firstUpdated?.(J),this.sync()}render(){let J=this.previewing??this.score,Z=this.valueText||`${this.score} out of ${this.max}`,K=Math.max(0,Math.round(this.max)),Q=this.steps[0],Y=($,V)=>F`<span part="mark">${this.markFor($,V)}</span>`,X=($)=>Array.from({length:K},(V,O)=>Y($,O));return F`<div
      part="marks"
      role=${this.readOnly?"img":"radiogroup"}
      aria-label=${this.readOnly?Z:this.label||z}
      data-slotted=${this.markSource?"":z}
      style=${`--rating-full: ${Math.floor(J)}; --rating-part: ${J-Math.floor(J)}; --rating-steps: ${this.steps.length}`}
      @pointercancel=${this.handleDragCancel}
      @pointerdown=${this.handleDragStart}
      @pointermove=${this.handleDragMove}
      @pointerup=${this.handleDragEnd}
    >
      <!-- Hidden because this is where the shape arrives, not where it is drawn:
           what a reader sees is the clones, one per position. -->
      <slot
        name="mark"
        hidden
        @slotchange=${this.handleMarkSlot}
      ></slot>
      <span
        part="track"
        aria-hidden="true"
        >${X("track")}</span
      >
      <span
        part="fill"
        aria-hidden="true"
        >${X("fill")}</span
      >
      ${this.readOnly?z:this.steps.map(($,V)=>F`<button
                part="option"
                role="radio"
                type="button"
                aria-checked=${this.score===$?"true":"false"}
                aria-label=${`${$} out of ${this.max}`}
                data-score=${String($)}
                style=${`--rating-step: ${V+1}`}
                ?disabled=${this.isDisabled}
                tabindex=${this.score===$||this.score===0&&$===Q?"0":"-1"}
                @click=${this.handleOptionClick}
                @pointerenter=${this.handleOptionEnter}
              ></button>`)}
    </div>
    ${this.showValue?F`<span
          part="value"
          aria-hidden="true"
          >${J}</span
        >`:z}`}get valueAsNumber(){return e5(this.value)}set valueAsNumber(J){this.value=J9(J)}};AJ([q({type:Number})],$1.prototype,"max",void 0);AJ([q({type:Number})],$1.prototype,"min",void 0);AJ([q({type:Number})],$1.prototype,"step",void 0);AJ([q({attribute:"readonly",reflect:!0,type:Boolean})],$1.prototype,"readOnly",void 0);AJ([q({attribute:"value-text"})],$1.prototype,"valueText",void 0);AJ([q({attribute:"show-value",reflect:!0,type:Boolean})],$1.prototype,"showValue",void 0);AJ([U()],$1.prototype,"markSource",void 0);AJ([U()],$1.prototype,"previewing",void 0);$1=AJ([G("helix-headless-rating")],$1);var X$=N(`:host {

--_rating-mark-size: var(--rating-size, var(--helix-size-icon-md));
--_rating-mark-gap: var(--rating-gap, var(--helix-space-2xs));

align-items: center;
display: inline-flex;
gap: var(--rating-gap, var(--helix-space-xs));
}

[part="marks"] {
display: inline-flex;
position: relative;

touch-action: pan-y;
}

[part="track"],
[part="fill"] {
display: inline-flex;
gap: var(--_rating-mark-gap);
}

[part="track"] {
color: var(--rating-empty-color, var(--helix-color-border));
}

[part="fill"] {
color: var(--rating-color, var(--helix-color-warning));
inline-size: calc(
var(--rating-full, 0) *
(var(--_rating-mark-size) + var(--_rating-mark-gap)) +
var(--rating-part, 0) *
var(--_rating-mark-size)
);
inset-block: 0;
inset-inline-start: 0;
overflow: hidden;
position: absolute;
}

[part="mark"] {
--_rating-star: url('data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3-5.8 3 1.1-6.5L2.6 9.4l6.5-.9z"/></svg>');

background-color: currentcolor;
block-size: var(--_rating-mark-size);
flex: 0 0 auto;
inline-size: var(--_rating-mark-size);
mask-image: var(--rating-mark, var(--_rating-star));
mask-position: center;
mask-repeat: no-repeat;
mask-size: contain;
}

[part="option"] {
all: unset;
box-sizing: border-box;

cursor: pointer;
inset-block: 0;
position: absolute;
}

[part="option"] {
--_rating-pitch: calc((100% + var(--_rating-mark-gap)) / var(--rating-steps, 1));

inline-size: var(--_rating-pitch);
inset-inline-start: calc(
(var(--rating-step, 1) - 1) *
var(--_rating-pitch) -
var(--_rating-mark-gap) /
2
);
}

[part="value"] {
color: var(--helix-color-foreground-muted);
font-size: var(--helix-text-sm);
font-variant-numeric: tabular-nums;
line-height: 1;
}

:host([variant="dots"]) {
--_rating-mark-size: var(--rating-size, var(--helix-size-icon-sm));
}

:host([variant="dots"]) [part="mark"] {
border-radius: var(--helix-radii-full);
mask-image: none;
}

[part="option"]:focus-visible {
border-radius: var(--helix-radii-sm);
outline: var(--helix-size-focus-ring) solid var(--helix-color-focus-ring);
outline-offset: var(--helix-size-focus-offset);
}

:host(:disabled) [part="option"] {
cursor: not-allowed;
}

:host(:disabled) [part="marks"] {
opacity: 0.5;
}

:host([readonly]) [part="marks"] {
cursor: default;
}

[data-slotted] [part="mark"] {
background-color: transparent;
mask-image: none;
}

@media print {
:host {
box-shadow: none;
print-color-adjust: exact;
}
}`);var $$=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},LY=class W extends $1{static{this.styles=X$}};$$([q({reflect:!0})],LY.prototype,"variant",void 0);LY=$$([G("helix-rating")],LY);var q$=N(`:host {
display: block;
min-block-size: 0;
}

[part="frame"] {
background-color: var(--helix-color-background);
block-size: 100%;
border: none;
display: block;
inline-size: 100%;
}`);var Q7=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},MY,nV=120,DJ=class W extends A{constructor(){super(...arguments);this.src="",this.source="",this.styles="",this.label="Preview",this.ready=!1,this.handleFrameLoad=()=>{this.ready=!0,this.send()},this.handleMessage=(J)=>{if(J.source!==this.frame?.contentWindow||J.origin!=="null")return;if(J.data?.type==="helix-preview-ready"){this.ready=!0,this.send();return}if(J.data?.type==="helix-preview-console")this.dispatchEvent(new U8({level:J.data.level,text:J.data.text}));if(J.data?.type==="helix-preview-size")this.dispatchEvent(new wJ({size:J.data.size}))}}static{MY=this}get frame(){return this.renderRoot.querySelector("iframe")}static{this.target="*"}scheduleSend(){clearTimeout(this.pending),this.pending=setTimeout(()=>{this.pending=void 0,this.send()},nV)}send(){if(!this.ready)return;let J={...this.colorMode?{colorMode:this.colorMode}:{},direction:this.direction??"ltr",layout:this.layout??"padded",source:this.source,styles:this.styles,type:"helix-preview-render"};this.frame?.contentWindow?.postMessage(J,MY.target)}connectedCallback(){super.connectedCallback(),window.addEventListener("message",this.handleMessage)}disconnectedCallback(){super.disconnectedCallback(),clearTimeout(this.pending),this.pending=void 0,window.removeEventListener("message",this.handleMessage)}reload(){let J=this.frame;if(!J)return;this.ready=!1,J.src=this.src}updated(J){if(super.updated(J),J.has("src")){this.ready=!1;return}if(J.has("source")||J.has("styles")){this.scheduleSend();return}this.send()}render(){return F`<iframe
      part="frame"
      @load=${this.handleFrameLoad}
      src=${this.src}
      title=${this.label}
      allow="clipboard-write *; fullscreen *"
      sandbox="allow-scripts allow-forms"
    ></iframe>`}static{this.styles=q$}};Q7([q({attribute:"color-mode"})],DJ.prototype,"colorMode",void 0);Q7([q()],DJ.prototype,"src",void 0);Q7([q()],DJ.prototype,"source",void 0);Q7([q()],DJ.prototype,"styles",void 0);Q7([q()],DJ.prototype,"label",void 0);Q7([q({reflect:!0})],DJ.prototype,"direction",void 0);Q7([q({reflect:!0})],DJ.prototype,"layout",void 0);DJ=MY=Q7([G("helix-sandbox-preview")],DJ);var S0=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},SY,lV=512,q0=SY=class W extends A{constructor(){super(...arguments);this.defaultPosition=50,this.collapsedSize=0,this.min=0,this.max=100,this.step=2,this.label="Resize panes",this.cornerLabel="Resize both",this.positionState=void 0,this.collapsedState=void 0,this.opened=void 0,this.reached=void 0,this.dragging=!1,this.crossings=[],this.outer=null,this.crossedAt=void 0,this.cornerOrigin=null,this.origin=null,this.stacked=!1,this.handlePointerDown=(J)=>{let Z=J.currentTarget,K=this.getBoundingClientRect();this.origin=this.vertical?{length:K.height,start:K.top}:{length:K.width,start:K.left},u8(Z,J.pointerId),this.opened=this.collapsed?void 0:this.position,this.reached=void 0,this.dragging=!0,J.preventDefault()},this.handlePointerMove=(J)=>{let Z=this.origin;if(!Z||Z.length===0)return;let Q=((this.vertical?J.clientY:J.clientX)-Z.start)/Z.length*100,Y=!this.vertical&&getComputedStyle(this).direction==="rtl";this.move(Y?100-Q:Q)},this.handlePointerUp=(J)=>{if(!this.origin)return;let Z=J.currentTarget;if(Z.hasPointerCapture(J.pointerId))Z.releasePointerCapture(J.pointerId);if(this.origin=null,this.dragging=!1,this.reached===void 0)return;this.settle(this.reached)},this.handleKeydown=(J)=>{let Z=this.vertical?"ArrowUp":"ArrowLeft",K=this.vertical?"ArrowDown":"ArrowRight",Q;if(J.key===Z)Q=this.position-this.step;else if(J.key===K)Q=this.position+this.step;else if(J.key==="Home")Q=this.minPercent;else if(J.key==="End")Q=this.maxPercent;else return;this.move(Q),this.settle(Q),J.preventDefault()},this.handleDoubleClick=()=>{this.reset()},this.handleCornerDoubleClick=(J)=>{let Z=this.crossings[Number(J.currentTarget.dataset.cross)];if(!Z)return;this.reset(),Z.by.reset(),this.leaveSeparator(J)},this.handleCornerDown=(J)=>{let Z=J.currentTarget,K=this.crossings[Number(Z.dataset.cross)];if(!K)return;let Q=this.getBoundingClientRect(),Y=K.by.getBoundingClientRect();this.cornerOrigin={by:K.by,inner:K.by.vertical?{length:Y.height,start:Y.top}:{length:Y.width,start:Y.left},outer:this.vertical?{length:Q.height,start:Q.top}:{length:Q.width,start:Q.left}},u8(Z,J.pointerId),this.opened=this.collapsed?void 0:this.position,K.by.opened=K.by.collapsed?void 0:K.by.position,this.reached=void 0,K.by.reached=void 0,this.dragging=!0,K.by.dragging=!0,this.leaveSeparator(J)},this.handleCornerMove=(J)=>{let Z=this.cornerOrigin;if(!Z)return;let K=getComputedStyle(this).direction==="rtl",Q=($,V,O)=>{if($.length===0)return;let B=(V-$.start)/$.length*100;return O&&K?100-B:B},Y=Q(Z.outer,this.vertical?J.clientY:J.clientX,!this.vertical),X=Q(Z.inner,Z.by.vertical?J.clientY:J.clientX,!Z.by.vertical);if(Y!==void 0)this.moveTo(Y);if(X!==void 0)Z.by.moveTo(X);this.leaveSeparator(J)},this.handleCornerUp=(J)=>{let Z=this.cornerOrigin;if(!Z)return;let K=J.currentTarget;if(K.hasPointerCapture(J.pointerId))K.releasePointerCapture(J.pointerId);this.cornerOrigin=null,this.moveTo(this.reached??this.position,!0),Z.by.moveTo(Z.by.reached??Z.by.position,!0),this.leaveSeparator(J)},this.handleCornerKeydown=(J)=>{let Z=this.crossings[Number(J.currentTarget.dataset.cross)];if(!Z)return;let K=Z.by,Q=this.vertical?"ArrowUp":"ArrowLeft",Y=this.vertical?"ArrowDown":"ArrowRight",X=K.vertical?"ArrowUp":"ArrowLeft",$=K.vertical?"ArrowDown":"ArrowRight";if(J.key===Q||J.key===Y)this.moveTo(this.position+(J.key===Q?-this.step:this.step),!0);else if(J.key===X||J.key===$)K.moveTo(K.position+(J.key===X?-K.step:K.step),!0);else return;this.leaveSeparator(J)}}get position(){let J=this.collapsed;if(J)return J==="start"?this.sliver:100-this.sliver;return this.clamp(this.positionState??this.defaultPosition)}set position(J){let Z=this.position;this.positionState=J,this.reached=void 0,this.requestUpdate("position",Z)}get collapsed(){let J=this.collapsedState;if(J===void 0)return this.defaultCollapsed;return J==="none"?void 0:J}set collapsed(J){let Z=this.collapsed;this.collapsedState=J??"none",this.requestUpdate("collapsed",Z)}toPercent(J,Z){if(typeof J==="number")return Number.isFinite(J)?J:Z;let K=J.trim();if(K==="")return Z;let Q=Number(K);if(Number.isFinite(Q))return Q;let Y=/^(-?[\d.]+)(em|px|rem)$/.exec(K);if(!Y||typeof window==="undefined")return Z;let X=Number(Y[1]),$=Number.parseFloat(getComputedStyle(document.documentElement).fontSize)||16,V=Number.parseFloat(getComputedStyle(this).fontSize)||$,O=Y[2]==="px"?X:X*(Y[2]==="rem"?$:V),B=this.getBoundingClientRect(),D=this.vertical?B.height:B.width;return D>0?O/D*100:Z}get minPercent(){return this.toPercent(this.min,0)}get maxPercent(){return this.toPercent(this.max,100)}get showing(){return this.reached===void 0?this.position:this.clamp(this.reached)}moveTo(J,Z=!1){if(this.dragging=!Z,Z)this.settle(J);else this.move(J)}get sliver(){return Math.min(100,Math.max(0,this.collapsedSize))}get flush(){return this.sliver===0&&this.shutAt(this.position)!==void 0}shutAt(J){let Z=this.sliver;if(J<=Z)return"start";return J>=100-Z?"end":void 0}clamp(J){let Z=Math.max(0,Math.min(100,this.minPercent)),K=Math.max(Z,Math.min(100,this.maxPercent));return Math.min(K,Math.max(Z,Number.isFinite(J)?J:Z))}watchWidth(){if(this.orientation!=="auto"){this.sizes?.disconnect(),this.sizes=void 0;return}if(this.sizes)return;this.sizes=new ResizeObserver(([J])=>{let Z=J?.borderBoxSize?.[0]?.inlineSize??J?.contentRect.width??0;if(Z>0)this.stacked=Z<lV}),this.sizes.observe(this)}get vertical(){return this.orientation==="vertical"||this.orientation==="auto"&&this.stacked}move(J){let Z=this.clamp(J);if(this.reached=Z,Z===this.position)return;let K=this.position;this.positionState=Z,this.collapsedState="none",this.requestUpdate("position",K)}settle(J){let Z=this.clamp(J),K=this.shutAt(Z);if(h({apply:(Q)=>{let Y=this.position;this.positionState=Q,this.requestUpdate("position",Y)},event:(Q)=>new N8({value:String(Q)}),host:this,next:Z}),K!==this.collapsed)h({apply:(Q)=>{let Y=this.collapsed;if(Q!==""&&this.opened!==void 0)this.positionState=this.opened;this.collapsedState=Q===""?"none":Q,this.requestUpdate("collapsed",Y)},event:(Q)=>new A8({value:Q}),host:this,next:K??""})}reset(){let J=this.clamp(this.defaultPosition);this.move(J),this.settle(J)}cross(J,Z){let K=this.crossings.find((Q)=>Q.by===J);if(K){if(K.at===Z)return;K.at=Z}else this.crossings.push({at:Z,by:J});this.requestUpdate()}uncross(J){let Z=this.crossings.findIndex((K)=>K.by===J);if(Z===-1)return;this.crossings.splice(Z,1),this.requestUpdate()}findOuter(){let J=h1(this.parentElement,SY);if(!J||J===this||J.vertical===this.vertical)return;this.outer=J,this.crossedAt=this.position,J.cross(this,this.position)}leaveSeparator(J){J.stopPropagation(),J.preventDefault()}connectedCallback(){if(super.connectedCallback(),this.hasUpdated)this.watchWidth(),this.findOuter()}disconnectedCallback(){super.disconnectedCallback(),this.sizes?.disconnect(),this.sizes=void 0,this.outer?.uncross(this),this.outer=null,this.crossedAt=void 0}firstUpdated(J){super.firstUpdated(J),this.watchWidth(),this.findOuter()}updated(J){if(super.updated(J),J.has("orientation"))this.watchWidth();if(this.collapsed)this.dataset.collapsed=this.collapsed;else delete this.dataset.collapsed;if(this.orientation==="auto"&&this.stacked)this.dataset.axis="vertical";else delete this.dataset.axis;if(this.outer&&this.showing!==this.crossedAt)this.crossedAt=this.showing,this.outer.cross(this,this.showing)}willUpdate(J){super.willUpdate(J)}render(){let J=this.showing;return F`<div
        part="start"
        ?data-dragging=${this.dragging}
        style="--splitter-position: ${J}%"
      >
        <slot name="start"></slot>
      </div>
      <div
        part="separator"
        role="separator"
        tabindex="0"
        aria-label=${this.label}
        aria-orientation=${this.vertical?"horizontal":"vertical"}
        aria-valuemax=${this.clamp(this.maxPercent)}
        aria-valuemin=${this.clamp(this.minPercent)}
        aria-valuenow=${Math.round(J)}
        ?data-dragging=${this.dragging}
        ?data-flush=${this.flush}
        @dblclick=${this.handleDoubleClick}
        @keydown=${this.handleKeydown}
        @pointercancel=${this.handlePointerUp}
        @pointerdown=${this.handlePointerDown}
        @pointermove=${this.handlePointerMove}
        @pointerup=${this.handlePointerUp}
      ></div>
      <div part="end" ?data-dragging=${this.dragging}>
        <slot name="end"></slot>
      </div>
      ${this.crossings.map((Z,K)=>F`<div
          part="corner"
          role="separator"
          tabindex="0"
          aria-label=${this.cornerLabel}
          aria-orientation=${Z.by.vertical?"horizontal":"vertical"}
          aria-valuemax="100"
          aria-valuemin="0"
          aria-valuenow=${Math.round(Z.at)}
          data-cross=${K}
          style="--splitter-corner-at: ${Z.at}%; --splitter-position: ${J}%"
          @dblclick=${this.handleCornerDoubleClick}
          @keydown=${this.handleCornerKeydown}
          @pointercancel=${this.handleCornerUp}
          @pointerdown=${this.handleCornerDown}
          @pointermove=${this.handleCornerMove}
          @pointerup=${this.handleCornerUp}
        ></div>`)}`}};S0([q({reflect:!0})],q0.prototype,"orientation",void 0);S0([q({type:Number})],q0.prototype,"position",null);S0([q({attribute:"default-position",type:Number})],q0.prototype,"defaultPosition",void 0);S0([q()],q0.prototype,"collapsed",null);S0([q({attribute:"default-collapsed"})],q0.prototype,"defaultCollapsed",void 0);S0([q({attribute:"collapsed-size",type:Number})],q0.prototype,"collapsedSize",void 0);S0([q()],q0.prototype,"min",void 0);S0([q()],q0.prototype,"max",void 0);S0([q({type:Number})],q0.prototype,"step",void 0);S0([q()],q0.prototype,"label",void 0);S0([q({attribute:"corner-label"})],q0.prototype,"cornerLabel",void 0);S0([U()],q0.prototype,"reached",void 0);S0([U()],q0.prototype,"dragging",void 0);S0([U()],q0.prototype,"stacked",void 0);q0=SY=S0([G("helix-headless-splitter")],q0);var G$=N(`:host {
display: flex;
min-block-size: 0;
min-inline-size: 0;

position: relative;
}

:host(:is([orientation="vertical"], [data-axis="vertical"])) {
flex-direction: column;
}

[part="start"] {
flex: 0 0 var(--splitter-position, 50%);

min-block-size: 0;
min-inline-size: 0;
overflow: auto;
}

[part="end"] {
flex: 1 1 0;
min-block-size: 0;
min-inline-size: 0;
overflow: auto;
}

[part="separator"] {
background-color: transparent;
box-sizing: border-box;
cursor: col-resize;
flex: none;
inline-size: var(--splitter-target, var(--helix-space-xs));
margin-inline: calc(var(--splitter-target, var(--helix-space-xs)) / -2);
position: relative;

touch-action: none;
user-select: none;

z-index: var(--helix-layer-raised);
}

[part="separator"]::before {
background-color: var(--splitter-color, var(--helix-color-border));
content: "";
inline-size: var(--helix-border-thin);
inset-block: 0;
inset-inline-start: 50%;
margin-inline-start: calc(var(--helix-border-thin) / -2);
position: absolute;
transition:
background-color var(--helix-duration-fast) var(--helix-easing-standard),
inline-size var(--helix-duration-fast) var(--helix-easing-standard);
}

:host(:is([orientation="vertical"], [data-axis="vertical"])) [part="separator"] {
block-size: var(--splitter-target, var(--helix-space-xs));
cursor: row-resize;
inline-size: auto;
margin-block: calc(var(--splitter-target, var(--helix-space-xs)) / -2);
margin-inline: 0;
}

:host(:is([orientation="vertical"], [data-axis="vertical"])) [part="separator"]::before {
block-size: var(--helix-border-thin);
inline-size: auto;
inset-block-start: 50%;
inset-inline: 0;
margin-block-start: calc(var(--helix-border-thin) / -2);
transition:
background-color var(--helix-duration-fast) var(--helix-easing-standard),
block-size var(--helix-duration-fast) var(--helix-easing-standard);
}

[part="separator"]:hover,
[part="separator"]:focus-visible,
[part="separator"][data-dragging] {
z-index: calc(var(--helix-layer-raised) + 1);
}

[part="separator"][data-flush]::before {
background-color: transparent;
}

:host(:not([variant="grip"])) [part="separator"]:hover::before,
:host(:not([variant="grip"])) [part="separator"]:focus-visible::before,
:host(:not([variant="grip"])) [part="separator"][data-dragging]::before {
background-color: var(--splitter-hover-color, var(--helix-color-foreground-muted));
inline-size: var(--helix-border-thick);
}

:host(:not([variant="grip"])) [part="separator"][data-dragging]::before {
background-color: var(--splitter-drag-color, var(--helix-color-primary));
}

:host(:is([orientation="vertical"], [data-axis="vertical"]):not([variant="grip"]))
[part="separator"]:hover::before,
:host(:is([orientation="vertical"], [data-axis="vertical"]):not([variant="grip"]))
[part="separator"]:focus-visible::before,
:host(:is([orientation="vertical"], [data-axis="vertical"]):not([variant="grip"]))
[part="separator"][data-dragging]::before {
block-size: var(--helix-border-thick);
inline-size: auto;
}

[part="separator"]:focus-visible {
outline: none;
}

[part="separator"]:focus-visible::before {
outline: var(--helix-size-focus-ring) solid var(--helix-color-focus-ring);
outline-offset: var(--helix-size-focus-offset);
}

@media (prefers-reduced-motion: reduce) {
[part="separator"]::before,
:host(:is([orientation="vertical"], [data-axis="vertical"])) [part="separator"]::before {
transition: none;
}
}

[part="corner"] {
block-size: var(--splitter-corner, var(--helix-space-md));

cursor: move;
inline-size: var(--splitter-corner, var(--helix-space-md));
inset-block-start: var(--splitter-corner-at);
inset-inline-start: var(--splitter-position);
margin-block-start: calc(var(--splitter-corner, var(--helix-space-md)) / -2);
margin-inline-start: calc(var(--splitter-corner, var(--helix-space-md)) / -2);
position: absolute;
touch-action: none;
user-select: none;
z-index: calc(var(--helix-layer-raised) + 2);
}

:host(:is([orientation="vertical"], [data-axis="vertical"])) [part="corner"] {
inset-block-start: var(--splitter-position);
inset-inline-start: var(--splitter-corner-at);
}

[part="corner"]:focus-visible {
outline: var(--helix-size-focus-ring) solid var(--helix-color-focus-ring);
outline-offset: var(--helix-size-focus-offset);
}

:host([variant="grip"]) [part="separator"]::after {
background-color: var(--splitter-grip-color, var(--helix-color-foreground-muted));
border-radius: var(--helix-radii-full);
content: "";
opacity: 0;
position: absolute;
transition:
background-color var(--helix-duration-fast) var(--helix-easing-standard),
opacity var(--helix-duration-fast) var(--helix-easing-standard);
}

:host([variant="grip"]:not(:is([orientation="vertical"], [data-axis="vertical"])))
[part="separator"]::after {
block-size: var(--splitter-grip-length, 2rem);
inline-size: var(--helix-border-thick);
inset-block-start: calc(50% - var(--splitter-grip-length, 2rem) / 2);
inset-inline-start: calc(50% - var(--helix-border-thick) - var(--helix-space-2xs));
}

:host([variant="grip"]:is([orientation="vertical"], [data-axis="vertical"]))
[part="separator"]::after {
block-size: var(--helix-border-thick);
inline-size: var(--splitter-grip-length, 2rem);
inset-block-start: calc(50% - var(--helix-border-thick) - var(--helix-space-2xs));
inset-inline-start: calc(50% - var(--splitter-grip-length, 2rem) / 2);
}

:host([variant="grip"]) [part="separator"]:hover::after,
:host([variant="grip"]) [part="separator"]:focus-visible::after,
:host([variant="grip"]) [part="separator"][data-dragging]::after {
opacity: 1;
}

:host([variant="grip"]) [part="separator"][data-dragging]::after {
background-color: var(--splitter-drag-color, var(--helix-color-primary));
}

@media (prefers-reduced-motion: reduce) {
:host([variant="grip"]) [part="separator"]::after {
transition: none;
}
}

[part="start"][data-dragging],
[part="end"][data-dragging] {
pointer-events: none;
}

@media print {
:host {
box-shadow: none;
max-block-size: none;
overflow: visible;
}
}`);var z$=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},RY=class W extends q0{static{this.styles=G$}};z$([q({reflect:!0})],RY.prototype,"variant",void 0);RY=z$([G("helix-splitter")],RY);var V$=N(`:host {
background-color: var(--helix-color-background);
display: grid;
grid-template-rows: auto minmax(0, 1fr) auto;
min-block-size: var(--sandbox-min-block-size, 20rem);
overflow: hidden;
}

::slotted([slot="toolbar"]) {
grid-row: 1;
}

[part="body"] {
grid-row: 2;
min-block-size: 0;
}

::slotted([slot="status"]) {
grid-row: 3;
}

[part="body"],
[part="panes"] {
--splitter-color: var(--sandbox-separator-color, var(--helix-color-border));
--splitter-target: calc(var(--sandbox-grab, var(--helix-space-2xs)) * 2);
min-block-size: 0;
min-inline-size: 0;
}

[part="panes"] {
block-size: 100%;
}

[part="body"]:not([data-panel])::part(separator) {
display: none;
}

[part="body"]:not([data-panel])::part(corner) {
display: none;
}

[part="pane"] {
block-size: 100%;
min-block-size: 0;
min-inline-size: 0;
overflow: hidden;
}

[part="panel"] {
block-size: 100%;
min-block-size: 0;
overflow: hidden;
}

::slotted([slot="panel"]) {
block-size: 100%;
min-block-size: 0;
}

::slotted(helix-sandbox-preview) {
background-color: var(--helix-color-background);
block-size: 100%;
color: var(--helix-color-foreground);
display: block;
}

@media print {
:host {
display: none;
}
}`);var q1=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},A4=50,D4=160,EY=0.8,o0=class W extends A{constructor(){super(...arguments);this.lead="source",this.split=A4,this.defaultSplit=A4,this.panelSize=D4,this.defaultPanelSize=D4,this.panelCollapsedSize=0,this.panelLabel="Resize panel",this.cornerLabel="Resize panes and panel",this.separatorLabel="Resize source pane",this.hasPanel=!1,this.bodyHeight=0,this.watch=typeof ResizeObserver==="undefined"?void 0:new ResizeObserver(()=>{this.requestUpdate()}),this.handleSourceChange=(J)=>{if(!this.fromSource(J.target))return;let{value:Z}=J.detail,K=J.composedPath()[0];if(K?.name!=="css"&&K?.name!=="html")return;for(let Q of this.previews)if(K.name==="css")Q.styles=Z;else Q.source=Z},this.handleCaret=(J)=>{if(!this.fromSource(J.target))return;let{column:Z,line:K}=J.detail;for(let Q of this.statusBars)Q.column=Z,Q.line=K},this.handleConsole=(J)=>{let Z=J.detail;for(let K of this.terminals)K.write(Z)},this.handlePanesChange=(J)=>{if(J.target!==J.currentTarget)return;let{value:Z}=J.detail;J.stopPropagation(),this.split=Number(Z),this.splitSettled()},this.handlePanelChange=(J)=>{if(J.target!==J.currentTarget)return;let{value:Z}=J.detail;if(J.stopPropagation(),this.bodyHeight<=0)return;this.panelSize=Math.max(0,(100-Number(Z))/100*this.bodyHeight),this.panelSettled()},this.readPanel=()=>{this.hasPanel=this.querySelector(':scope > [slot="panel"]')!==null}}get panelShare(){let J=Number.isFinite(this.panelSize)?this.panelSize:D4;if(this.bodyHeight<=0)return 0;return Math.min(EY*100,Math.max(0,J/this.bodyHeight*100))}get panelPosition(){return this.hasPanel?100-this.panelShare:100}get homePanelPosition(){let J=Number.isFinite(this.defaultPanelSize)?this.defaultPanelSize:D4;if(!this.hasPanel||this.bodyHeight<=0)return 100;return 100-Math.min(EY*100,Math.max(0,J/this.bodyHeight*100))}get panelSliver(){if(this.bodyHeight<=0)return 0;return Math.min(100,Math.max(0,this.panelCollapsedSize/this.bodyHeight*100))}fromSource(J){if(!(J instanceof Node))return!1;return(this.renderRoot.querySelector('slot[name="source"]')?.assignedElements({flatten:!0})??[]).some((K)=>K===J||K.contains(J))}parts(J){return[...this.querySelectorAll(J)]}get previews(){return this.parts("helix-sandbox-preview")}get terminals(){return this.parts("helix-sandbox-terminal")}get statusBars(){return this.parts("helix-sandbox-status-bar")}get axis(){return this.orientation??"horizontal"}splitSettled(){this.dispatchEvent(new O8({value:String(this.split)}))}panelSettled(){this.dispatchEvent(new B8({value:String(this.panelSize)}))}connectedCallback(){if(super.connectedCallback(),this.addEventListener("helix-caret",this.handleCaret),this.addEventListener("helix-console",this.handleConsole),this.addEventListener("helix-before-edit",this.handleSourceChange),this.hasUpdated)this.watchBody()}watchBody(){let J=this.renderRoot.querySelector('[part="body"]');if(!J)return;this.bodyHeight=J.getBoundingClientRect().height,this.watch?.observe(J),this.requestUpdate()}willUpdate(J){if(super.willUpdate(J),!this.hasUpdated||typeof this.renderRoot?.querySelector!=="function")return;let Z=this.renderRoot.querySelector('[part="body"]');if(Z)this.bodyHeight=Z.getBoundingClientRect().height}firstUpdated(J){super.firstUpdated(J),this.readPanel(),this.watchBody()}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("helix-caret",this.handleCaret),this.removeEventListener("helix-console",this.handleConsole),this.removeEventListener("helix-before-edit",this.handleSourceChange),this.watch?.disconnect()}render(){let J=this.axis==="vertical",Z=this.lead==="preview"?"preview":"source",K=Z==="preview"?"source":"preview",Q=Number.isFinite(this.split)?this.split:A4;return F`<slot name="toolbar"></slot>
      <helix-splitter
        part="body"
        ?data-panel=${this.hasPanel}
        exportparts="separator, corner"
        orientation="vertical"
        collapsed-size=${this.panelSliver}
        corner-label=${this.cornerLabel}
        label=${this.panelLabel}
        default-position=${this.homePanelPosition}
        min=${100-EY*100}
        .position=${this.panelPosition}
        @helix-before-resize=${this.handlePanelChange}
      >
        <helix-splitter
          slot="start"
          part="panes"
          exportparts="separator"
          default-position=${Number.isFinite(this.defaultSplit)?this.defaultSplit:A4}
          label=${this.separatorLabel}
          orientation=${J?"vertical":"horizontal"}
          .position=${Q}
          @helix-before-resize=${this.handlePanesChange}
        >
          ${""}
          <div part="pane" data-pane=${Z} slot="start"><slot name=${Z}></slot></div>
          <div part="pane" data-pane=${K} slot="end"><slot name=${K}></slot></div>
        </helix-splitter>
        <div part="panel" slot="end"><slot name="panel" @slotchange=${this.readPanel}></slot></div>
      </helix-splitter>
      <slot name="status"></slot>`}static{this.styles=V$}};q1([q({reflect:!0})],o0.prototype,"orientation",void 0);q1([q()],o0.prototype,"lead",void 0);q1([q({attribute:"split",type:Number})],o0.prototype,"split",void 0);q1([q({attribute:"default-split",type:Number})],o0.prototype,"defaultSplit",void 0);q1([q({attribute:"panel-size",type:Number})],o0.prototype,"panelSize",void 0);q1([q({attribute:"default-panel-size",type:Number})],o0.prototype,"defaultPanelSize",void 0);q1([q({attribute:"panel-collapsed-size",type:Number})],o0.prototype,"panelCollapsedSize",void 0);q1([q({attribute:"panel-label"})],o0.prototype,"panelLabel",void 0);q1([q({attribute:"corner-label"})],o0.prototype,"cornerLabel",void 0);q1([q({attribute:"separator-label"})],o0.prototype,"separatorLabel",void 0);q1([U()],o0.prototype,"hasPanel",void 0);o0=q1([G("helix-sandbox")],o0);var F$=N(`:host {
display: block;
block-size: 100%;
}

[part="source"] {
background-color: var(--sandbox-source-background, var(--helix-color-background));
block-size: 100%;
border: none;
color: var(--helix-color-foreground-muted);
display: block;
font-family: var(--helix-font-mono);
font-size: var(--helix-text-xs);
inline-size: 100%;
line-height: var(--helix-leading-normal);
min-block-size: var(--sandbox-source-min-block-size, 12rem);
padding: var(--helix-space-sm);
resize: none;
tab-size: 2;
}

[part="source"]:focus-visible {
background-color: var(--helix-color-surface);
outline: none;
}`);var R9=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},V5=class W extends A{constructor(){super(...arguments);this.value="",this.name="html",this.fieldLabel="Example source",this.tabIndents=!0,this.escaped=!1,this.reportCaret=(J)=>{let Z=J.target,K=Z.selectionStart??0,Q=Z.value.slice(0,K);this.dispatchEvent(new L8({column:K-(Q.lastIndexOf(`
`)+1)+1,line:Q.split(`
`).length}))},this.handleInput=(J)=>{let Z=J.target;this.edit(Z,Z.value),this.reportCaret(J)},this.handleKeydown=(J)=>{if(J.key==="Escape"){this.escaped=!0;return}if(J.key!=="Tab"||!this.tabIndents||this.escaped){this.escaped=!1;return}J.preventDefault();let Z=J.target,{selectionEnd:K,selectionStart:Q,value:Y}=Z;Z.value=`${Y.slice(0,Q)}  ${Y.slice(K)}`,Z.selectionStart=Q+2,Z.selectionEnd=Z.selectionStart,this.edit(Z,Z.value)}}edit(J,Z){let K=new D8({value:Z});if(this.dispatchEvent(K))this.value=Z;Q0(J,this.value)}render(){return F`<textarea
      part="source"
      aria-label=${this.fieldLabel}
      spellcheck="false"
      .value=${this.value}
      @focus=${this.reportCaret}
      @input=${this.handleInput}
      @keydown=${this.handleKeydown}
      @keyup=${this.reportCaret}
      @pointerup=${this.reportCaret}
    ></textarea>`}static{this.styles=F$}};R9([q()],V5.prototype,"value",void 0);R9([q()],V5.prototype,"name",void 0);R9([q({attribute:"field-label"})],V5.prototype,"fieldLabel",void 0);R9([q({attribute:"tab-indents",converter:M7})],V5.prototype,"tabIndents",void 0);V5=R9([G("helix-sandbox-source")],V5);var N$=N(`:host {
align-items: center;
background-color: var(--helix-color-background);
border-block-start: var(--helix-border-thin) solid var(--helix-color-border);
color: var(--sandbox-status-bar-color, var(--helix-color-foreground-subtle));
display: flex;
font-size: var(--helix-text-xs);
gap: var(--helix-space-sm);
line-height: var(--helix-leading-tight);
padding: var(--helix-space-2xs) var(--helix-space-sm);

user-select: none;
}

slot:first-child + * {
margin-inline-start: auto;
}

[part="caret"] {
font-variant-numeric: tabular-nums;
}`);var P4=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},cV={css:"CSS",html:"HTML",javascript:"JavaScript",tsx:"TSX"},E9=class W extends A{get position(){if(this.line===void 0||this.column===void 0)return;return`Ln ${this.line}, Col ${this.column}`}render(){let J=this.language,Z=this.position;return F`<slot></slot>
      ${Z===void 0?z:F`<span part="caret">${Z}</span>`}
      ${J===void 0?z:F`<span part="language">${cV[J]??J}</span>`}
      <slot name="end"></slot>`}static{this.styles=N$}};P4([q({type:Number})],E9.prototype,"column",void 0);P4([q()],E9.prototype,"language",void 0);P4([q({type:Number})],E9.prototype,"line",void 0);E9=P4([G("helix-sandbox-status-bar")],E9);var O$=N(`:host {

block-size: var(--sandbox-terminal-size, 100%);
display: grid;
grid-template-rows: minmax(0, 1fr);
min-block-size: 0;
}

[part="log"] {
font-family: var(--helix-font-mono);
font-size: var(--helix-text-xs);
line-height: var(--helix-leading-normal);
overflow: auto;
padding: var(--helix-space-xs) var(--helix-space-sm);
}

[part="log"]:focus-visible {
outline: var(--helix-size-focus-ring) solid var(--helix-color-focus-ring);
outline-offset: calc(var(--helix-size-focus-offset) * -1);
}

[part="empty"] {
color: var(--helix-color-foreground-subtle);
margin: var(--helix-space-none);
}

[part="entry"] {
align-items: baseline;
color: var(--helix-color-foreground-muted);
display: grid;
gap: var(--helix-space-xs);
grid-template-columns: 3.5rem minmax(0, 1fr) auto;
padding-block: var(--helix-space-2xs);
}

[part="level"] {
color: var(--helix-color-foreground-subtle);
text-transform: uppercase;
}

[part="message"] {
white-space: pre-wrap;
word-break: break-word;
}

[part="count"] {
background-color: var(--helix-color-surface-sunken);
border-radius: var(--helix-radii-full);
color: var(--helix-color-foreground-subtle);
padding-inline: var(--helix-space-2xs);
}

[part="entry"][data-level="warn"] {
color: var(--helix-color-warning);
}

[part="entry"][data-level="warn"] [part="level"] {
color: var(--helix-color-warning);
}

[part="entry"][data-level="error"] {
color: var(--helix-color-danger);
}

[part="entry"][data-level="error"] [part="level"] {
color: var(--helix-color-danger);
}`);var I4=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},dV=200,w9=class W extends A{constructor(){super(...arguments);this.emptyLabel="Nothing written to the console yet.",this.label="Console output",this.entries=[],this.following=!0}get log(){return this.renderRoot.querySelector('[part="log"]')}write(J){let Z=this.log;if(Z)this.following=Z.scrollHeight-Z.scrollTop-Z.clientHeight<2;let K=this.entries.at(-1);if(K&&K.level===J.level&&K.text===J.text){this.entries=[...this.entries.slice(0,-1),{...K,count:K.count+1}];return}this.entries=[...this.entries,{...J,count:1}].slice(-dV)}clear(){this.entries=[],this.following=!0}updated(){if(this.following){let J=this.log;if(J)J.scrollTop=J.scrollHeight}}render(){return F`<div part="log" role="log" aria-label=${this.label} tabindex="0">
      ${this.entries.length===0?F`<p part="empty">${this.emptyLabel}</p>`:this.entries.map((J)=>F`<div part="entry" data-level=${J.level}>
                <span part="level" aria-hidden="true">${J.level}</span>
                <span part="message">${J.text}</span>
                ${J.count>1?F`<span part="count" aria-label="${J.count} times"
                        >${J.count}</span
                      >`:z}
              </div>`)}
    </div>`}static{this.styles=O$}};I4([q({attribute:"empty-label"})],w9.prototype,"emptyLabel",void 0);I4([q()],w9.prototype,"label",void 0);I4([U()],w9.prototype,"entries",void 0);w9=I4([G("helix-sandbox-terminal")],w9);var B$=N(`:host {

--helix-size-checkbox: var(--helix-size-checkbox-sm);
--helix-size-icon: var(--helix-size-icon-sm);
--helix-size-control: var(--helix-size-control-sm);
--helix-size-tag: var(--helix-size-tag-sm);

align-items: center;
background-color: var(--helix-color-background);

block-size: var(--sandbox-toolbar-size, var(--helix-size-control-lg));

border-block-end: var(--helix-border-thin) solid var(--helix-color-border);
display: flex;
min-block-size: 0;
padding-block: var(--helix-space-none);

padding-inline: var(--helix-space-md);
}

slot {
align-items: center;
display: flex;
gap: var(--sandbox-toolbar-gap, var(--helix-space-sm));
min-inline-size: 0;
}

slot[name="end"] {
margin-inline-start: auto;
}`);var iV=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},A$=class W extends A{render(){return F`<slot></slot>
      <slot name="end"></slot>`}static{this.styles=B$}};A$=iV([G("helix-sandbox-toolbar")],A$);var T4=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y};var e7=class W extends A{constructor(){super(...arguments);this.label="",this.more=[],this.scrolls=!1,this.measure=()=>{let J=this.scroller;if(!J)return;let Z=1,K=[];if(J.scrollTop>Z)K.push("block-start");if(J.scrollTop+J.clientHeight<J.scrollHeight-Z)K.push("block-end");if(J.scrollLeft>Z)K.push("inline-start");if(J.scrollLeft+J.clientWidth<J.scrollWidth-Z)K.push("inline-end");this.more=K,this.scrolls=J.scrollHeight>J.clientHeight||J.scrollWidth>J.clientWidth},this.handleSlotChange=(J)=>{let Z=J.target;for(let K of Z.assignedElements({flatten:!0}))this.watcher?.observe(K);this.measure()}}get scroller(){return this.renderRoot?.querySelector('[part="viewport"]')??null}connectedCallback(){if(super.connectedCallback(),this.watcher=new ResizeObserver(this.measure),this.hasUpdated)this.watchContent()}disconnectedCallback(){super.disconnectedCallback(),this.watcher?.disconnect(),this.watcher=void 0}firstUpdated(J){super.firstUpdated?.(J),this.watchContent(),this.measure()}watchContent(){let J=this.scroller;if(!J||!this.watcher)return;this.watcher.observe(J);for(let Z of J.querySelectorAll("slot"))for(let K of Z.assignedElements({flatten:!0}))this.watcher.observe(K)}updated(J){if(super.updated?.(J),this.toggleAttribute("data-scrolls",this.scrolls),this.more.length>0)this.setAttribute("data-more",this.more.join(" "));else this.removeAttribute("data-more")}render(){return F`<div
      data-scroller
      part="viewport"
      role=${this.label?"region":z}
      aria-label=${this.label||z}
      tabindex=${this.scrolls?"0":z}
      @scroll=${this.measure}
    >
      <slot @slotchange=${this.handleSlotChange}></slot>
    </div>
    <!-- The block edges are drawn on the host, which has two pseudo-elements and
         no more. The sideways pair needs two of its own, and an element to hang
         them on is cheaper than the arithmetic that would fit four edges into
         two: they can then be placed with logical properties, which is what
         makes inline-start the right-hand edge when the reader reads that way. -->
    <div
      part="edges"
      aria-hidden="true"
    ></div>`}};T4([q()],e7.prototype,"label",void 0);T4([U()],e7.prototype,"more",void 0);T4([U()],e7.prototype,"scrolls",void 0);e7=T4([G("helix-headless-scroll-area")],e7);var D$=N(`:host {
display: block;
position: relative;
}

[part="viewport"] {
block-size: 100%;
overflow: auto;
overscroll-behavior: contain;
}

[part="viewport"]:focus-visible {
outline: var(--helix-size-focus-ring) solid var(--helix-color-focus-ring);
outline-offset: calc(var(--helix-size-focus-offset) * -1);
}

[part="viewport"] {
scrollbar-color: var(--scroll-area-thumb-color, var(--helix-color-border))
var(--scroll-area-track-color, transparent);
scrollbar-width: var(--scroll-area-scrollbar, thin);
}

:host::before,
:host::after {
content: "";
opacity: 0;
pointer-events: none;
position: absolute;
transition: opacity var(--helix-duration-fast) var(--helix-easing-standard);
z-index: var(--helix-layer-raised);
}

:host::before {
background: linear-gradient(
to bottom,
var(--scroll-area-fade-color, var(--helix-color-background)),
transparent
);
block-size: var(--scroll-area-fade-block-start, var(--scroll-area-fade, var(--helix-space-xl)));
inset-block-start: 0;
inset-inline: 0;
}

:host::after {
background: linear-gradient(
to top,
var(--scroll-area-fade-color, var(--helix-color-background)),
transparent
);
block-size: var(--scroll-area-fade-block-end, var(--scroll-area-fade, var(--helix-space-xl)));
inset-block-end: 0;
inset-inline: 0;
}

:host([data-more~="block-start"])::before,
:host([data-more~="block-end"])::after {
opacity: 1;
}

[part="edges"] {
inset: 0;
pointer-events: none;
position: absolute;
}

[part="edges"]::before,
[part="edges"]::after {
content: "";
inset-block: 0;
opacity: 0;
position: absolute;
transition: opacity var(--helix-duration-fast) var(--helix-easing-standard);
z-index: var(--helix-layer-raised);
}

[part="edges"]::before {
background: linear-gradient(
to right,
var(--scroll-area-fade-color, var(--helix-color-background)),
transparent
);
inline-size: var(--scroll-area-fade-inline-start, var(--scroll-area-fade, var(--helix-space-xl)));
inset-inline-start: 0;
}

[part="edges"]::after {
background: linear-gradient(
to left,
var(--scroll-area-fade-color, var(--helix-color-background)),
transparent
);
inline-size: var(--scroll-area-fade-inline-end, var(--scroll-area-fade, var(--helix-space-xl)));
inset-inline-end: 0;
}

:host([data-more~="inline-start"]) [part="edges"]::before,
:host([data-more~="inline-end"]) [part="edges"]::after {
opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
:host::before,
:host::after,
[part="edges"]::before,
[part="edges"]::after {
transition: none;
}
}

@media print {
:host {
box-shadow: none;
max-block-size: none;
overflow: visible;
}
}`);var sV=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},P$=class W extends e7{static{this.styles=D$}};P$=sV([G("helix-scroll-area")],P$);var aV=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},U4=class W extends A{willUpdate(J){super.willUpdate(J),this.internals.ariaBusy="true",this.internals.ariaLive="polite"}render(){return F`<span part="skeleton"></span>`}};U4=aV([G("helix-headless-skeleton")],U4);var I$=N(`:host {
display: block;
inline-size: 100%;
}

:host([shape="text"]) {
block-size: 1em;
}

:host([shape="circle"]) {
aspect-ratio: 1 / 1;

inline-size: var(--skeleton-size, var(--helix-size-control));
}

[part="skeleton"] {
background-color: color-mix(in oklab, var(--helix-color-foreground) 8%, transparent);
block-size: 100%;
border-radius: var(--helix-radii-sm);
display: block;
inline-size: 100%;

overflow: hidden;
position: relative;
}

[part="skeleton"]::after {
animation: helix-skeleton-sweep calc(var(--helix-duration-slow) * 4) ease-in-out infinite;
background-image: linear-gradient(
90deg,
transparent 0%,
color-mix(in oklab, var(--helix-color-foreground) 8%, transparent) 50%,
transparent 100%
);
content: "";
inline-size: 200%;
inset-block: 0;
inset-inline-start: 0;
position: absolute;
}

:host([shape="text"]) [part="skeleton"] {
border-radius: var(--helix-radii-full);
}

:host([shape="circle"]) [part="skeleton"] {

border-radius: var(--helix-radii-full);
}

@keyframes helix-skeleton-sweep {
from {
translate: -50% 0;
}

to {
translate: 50% 0;
}
}

@media (prefers-reduced-motion: reduce) {
[part="skeleton"]::after {
animation: none;
background-image: none;
}
}

@media print {
:host {
display: none;
}
}`);var T$=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},wY=class W extends U4{static{this.styles=I$}};T$([q({reflect:!0})],wY.prototype,"shape",void 0);wY=T$([G("helix-skeleton")],wY);var F5=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},l1={height:32,width:100},oV=(W)=>W.split(/[\s,]+/).filter((J)=>J!=="").map(Number).filter((J)=>Number.isFinite(J)),PJ=class W extends A{constructor(){super(...arguments);this.for="",this.label="",this.values="",this.source=new HJ(this)}willUpdate(J){if(J.has("for"))this.source.watch()}#J(){let J=this.source.series;return J.length>0?J[0]?.points.map((Z)=>Z.value)??[]:oV(this.values)}render(){let J=this.#J(),Z=j0([0,Math.max(J.length-1,1)],[0,l1.width]),[K,Q]=e1(J.length>0?J:[0]),Y=this.plot==="bar"?j0([Math.min(0,K),Math.max(0,Q)],[l1.height,0]):j0([K,Q],[l1.height,0]),X=J.map((I,C)=>[Z(C),Y(I)]),$=this.plot==="bar"?"":L7(X,this.curve??"smooth"),V=this.plot!=="bar"&&this.plot!=="line"&&$!==""?`${$}L${l1.width},${l1.height}L0,${l1.height}Z`:"",O=l1.width/Math.max(J.length,1),B=Y(0),D=this.plot==="bar"?J.map((I,C)=>({height:Math.abs(B-Y(I)),width:O*0.72,x:C*O+O*0.14,y:Math.min(B,Y(I))})):[],P=J.length<2?void 0:`--chart-terminus-x: 100%; --chart-terminus-y: ${Y(J[J.length-1])/l1.height*100}%`;return F`<svg
        aria-hidden=${this.label===""?"true":z}
        aria-label=${this.label===""?z:this.label}
        part="svg"
        preserveAspectRatio="none"
        role=${this.label===""?z:"img"}
        style=${P??z}
        viewBox="0 0 ${l1.width} ${l1.height}"
      >
        ${_`<defs>
            <linearGradient id="sparkline-wash" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" part="wash-start" />
              <stop offset="1" part="wash-end" />
            </linearGradient>
          </defs>`}
        ${$===""?z:_`<path d=${$} part="line" />`}
        ${V===""?z:_`<path d=${V} part="area" />`}
        ${D.map((I)=>_`<rect
              height=${I.height}
              part="bar"
              width=${I.width}
              x=${I.x}
              y=${I.y}
            />`)}
      </svg>
      ${J.length<2||this.plot==="bar"?z:F`<span aria-hidden="true" part="terminus" style=${P??z}></span>`}`}};F5([q({reflect:!0})],PJ.prototype,"plot",void 0);F5([q({reflect:!0})],PJ.prototype,"curve",void 0);F5([q()],PJ.prototype,"for",void 0);F5([q()],PJ.prototype,"label",void 0);F5([q()],PJ.prototype,"values",void 0);PJ=F5([G("helix-headless-sparkline")],PJ);var U$=N(`:host {
block-size: var(--sparkline-block-size, 2.5em);

color: var(--_sparkline-ink);

--_sparkline-ink: var(--sparkline-color, var(--helix-color-series-1));

position: relative;

display: inline-block;
inline-size: var(--sparkline-inline-size, 7em);
vertical-align: middle;
}

[part="svg"] {
block-size: 100%;
inline-size: 100%;

overflow: visible;
}

[part="line"] {
fill: none;
stroke: currentColor;
stroke-linecap: round;
stroke-linejoin: round;

stroke-width: var(--sparkline-width, var(--_sparkline-weight, 0.11em));

vector-effect: non-scaling-stroke;
}

[part="area"] {
fill: none;
}

[part="wash-start"],
[part="wash-end"] {
stop-color: currentColor;
stop-opacity: 0;
}

:host(:not([plot="bar"]):not([plot="line"])) [part="area"] {
fill: url("#sparkline-wash");
}

:host(:not([plot="bar"]):not([plot="line"])) [part="wash-start"] {

stop-opacity: calc(var(--sparkline-area-opacity, 0.45) * var(--helix-material-opacity));
}

:host(:not([plot="bar"]):not([plot="line"])) [part="wash-end"] {
stop-opacity: calc(var(--sparkline-area-opacity, 0.45) / 9 * var(--helix-material-opacity));
}

:host([weight="thin"]) {
--_sparkline-weight: 0.07em;
}

:host([weight="thick"]) {
--_sparkline-weight: 0.18em;
}

[part="bar"] {
fill: currentColor;
rx: var(--sparkline-bar-radius, 0.5);
}

:host([terminus="ring"]) [part="svg"] {
mask-image: radial-gradient(
circle at var(--chart-terminus-x) var(--chart-terminus-y),
#0000 calc(var(--_chart-terminus-inner) - 0.5px),
#000 var(--_chart-terminus-inner)
);
}

@media print {
:host {
box-shadow: none;
print-color-adjust: exact;
}
}

:host([emphasis="subtle"]) {
color: color-mix(in oklab, var(--_sparkline-ink) 40%, var(--helix-color-background));
}

:host([emphasis="outlined"]) [part="bar"] {
fill: color-mix(in oklab, var(--_sparkline-ink) 55%, var(--helix-color-background));
stroke: var(--_sparkline-ink);
stroke-width: var(--sparkline-bar-stroke, 1);
vector-effect: non-scaling-stroke;
}

:host([emphasis="outlined"]) [part="area"] {
opacity: var(--sparkline-area-opacity, 0.35);
}

:host([emphasis="solid"]) [part="area"] {
opacity: 1;
}`);var C4=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},b9=class W extends PJ{static{this.styles=[Y4,U$]}};C4([q({reflect:!0})],b9.prototype,"emphasis",void 0);C4([q({reflect:!0})],b9.prototype,"weight",void 0);C4([q({reflect:!0})],b9.prototype,"terminus",void 0);b9=C4([G("helix-sparkline")],b9);var bY=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},N5=class W extends A{constructor(){super(...arguments);this.value="",this.disabled=!1,this.isSpeedDialItem=!0,this.handleClick=()=>{this.choose()}}focus(){this.renderRoot?.querySelector('[part="item"]')?.focus()}focusItem(){this.focus()}select(){this.choose()}get selected(){return this.ownerDocument.activeElement===this}choose(){if(this.disabled)return;this.dispatchEvent(new m({value:this.value}))}render(){return F`<button
      part="item"
      role="menuitem"
      type="button"
      aria-disabled=${this.disabled?"true":z}
      ?disabled=${this.disabled}
      @click=${this.handleClick}
    >
      <span part="icon"><slot name="icon"></slot></span>
      <span part="label"><slot></slot></span>
    </button>`}};bY([q()],N5.prototype,"value",void 0);bY([q({reflect:!0,type:Boolean})],N5.prototype,"disabled",void 0);N5=bY([G("helix-headless-speed-dial-item")],N5);var L4=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},J8=class W extends g(A){constructor(){super(...arguments);this.label="Actions",this.placement="top-end",this.offset=12,this.keys=new b0(this,{items:()=>this.items,selects:()=>!1}),this.panel=new d(this,{anchor:()=>this.trigger,boundary:()=>this,offset:()=>this.offset,onDismiss:()=>this.close(),placement:()=>this.placement,surface:()=>this.renderRoot?.querySelector('[part="actions"]')}),this.handleTriggerClick=()=>{this.requestOpen(!this.open)},this.handleSelect=()=>{this.close()},this.handleKeydown=(J)=>{if(J.key!=="Escape")return;J.stopPropagation(),this.close(),J.preventDefault()}}get trigger(){return D1(this.renderRoot?.querySelector('slot[name="trigger"]'),this.renderRoot?.querySelector('[part="trigger"]')??this)}get items(){return(this.renderRoot?.querySelector("slot:not([name])")?.assignedElements?.()??[]).filter((Z)=>Z.isSpeedDialItem===!0)}close(){if(!this.requestOpen(!1))return;this.trigger.focus()}connectedCallback(){super.connectedCallback(),this.addEventListener("helix-select",this.handleSelect),this.addEventListener("keydown",this.handleKeydown)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("helix-select",this.handleSelect),this.removeEventListener("keydown",this.handleKeydown)}announce(){let J=this.trigger;if(J===this.renderRoot?.querySelector('[part="trigger"]'))return;J.setAttribute("aria-expanded",this.open?"true":"false"),J.setAttribute("aria-haspopup","menu")}updated(J){if(super.updated?.(J),this.announce(),this.open)this.panel.show(),this.updateComplete.then(()=>{if(this.open)this.items.find((Z)=>!Z.disabled)?.focusItem()});else this.panel.hide()}renderTrigger(){return F`<slot name="trigger" @click=${this.handleTriggerClick}>
      <button
        part="trigger"
        type="button"
        aria-expanded=${this.open?"true":"false"}
        aria-haspopup="menu"
        aria-label=${this.label}
      >
        ${""}
        ${x(w7)}
      </button>
    </slot>`}render(){return F`${this.renderTrigger()}
      <div
        part="actions"
        popover="manual"
        role="menu"
        aria-label=${this.label||z}
        ?hidden=${!this.open}
      >
        <slot></slot>
      </div>`}};L4([q()],J8.prototype,"label",void 0);L4([q()],J8.prototype,"placement",void 0);L4([q({type:Number})],J8.prototype,"offset",void 0);J8=L4([G("helix-headless-speed-dial")],J8);var C$=N(`:host {
display: block;
}

[part="item"] {
align-items: center;
background: none;
border: none;
color: inherit;
cursor: pointer;
display: inline-flex;
flex-direction: row-reverse;
font: inherit;
gap: var(--helix-space-sm);
padding: var(--helix-space-none);
}

:host-context([data-placement$="-start"]) [part="item"] {
flex-direction: row;
}

[part="item"]:disabled {
cursor: not-allowed;
opacity: 0.5;
}

[part="icon"] {
--icon-size: var(--helix-size-icon-md);

align-items: center;
aspect-ratio: 1;
background-color: var(--helix-color-surface-overlay);
border-radius: var(--helix-radii-full);
box-shadow: var(--helix-shadow-md);
color: var(--helix-color-foreground);
display: inline-flex;
inline-size: var(--speed-dial-item-size, var(--helix-size-control-sm));
justify-content: center;
transition:
background-color var(--helix-duration-fast) var(--helix-easing-standard),
box-shadow var(--helix-duration-fast) var(--helix-easing-standard);
}

[part="item"]:not(:disabled):hover [part="icon"] {
background-color: color-mix(
in oklab,
var(--helix-color-foreground) 6%,
var(--helix-color-surface-overlay)
);
box-shadow: var(--helix-shadow-lg);
}

[part="item"]:focus-visible {
outline: none;
}

[part="item"]:focus-visible [part="icon"] {
outline: var(--helix-size-focus-ring) solid var(--helix-color-focus-ring);
outline-offset: var(--helix-size-focus-offset);
}

[part="label"] {
background-color: var(--helix-color-surface-overlay);
border-radius: var(--helix-radii-sm);
box-shadow: var(--helix-shadow-sm);
color: var(--helix-color-foreground);
font-family: var(--helix-font-sans);
font-size: var(--helix-text-sm);
font-weight: var(--helix-weight-medium);
padding: var(--helix-space-2xs) var(--helix-space-xs);
white-space: nowrap;
}

@media (prefers-reduced-motion: reduce) {
[part="icon"] {
transition: none;
}
}`);var rV=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},L$=class W extends N5{static{this.styles=C$}};L$=rV([G("helix-speed-dial-item")],L$);var M$=N(`:host {
display: inline-flex;
}

[part="actions"] {
background-color: transparent;
border: none;
display: flex;
flex-direction: column;
gap: var(--speed-dial-gap, var(--helix-space-sm));
margin: var(--helix-space-none);
overflow: visible;
padding: var(--helix-space-none);
}

[part="actions"] {
align-items: flex-end;
}

[part="actions"][data-placement$="-start"] {
align-items: flex-start;
}

[part="actions"][hidden] {
display: none;
}

[part="actions"] {
--_dial-from: var(--helix-space-md);
}

[part="actions"][data-placement^="bottom"] {
--_dial-from: calc(var(--helix-space-md) * -1);
}

[part="actions"] ::slotted(*) {
opacity: 0;
scale: 0.8;
transition:
opacity var(--helix-duration-fast) var(--helix-easing-standard),
scale var(--helix-duration-fast) var(--helix-easing-emphasized),
translate var(--helix-duration-fast) var(--helix-easing-emphasized);
translate: 0 var(--_dial-from);
}

[part="actions"][data-placed] ::slotted(*) {
opacity: 1;
scale: 1;
translate: 0 0;
}

[part="actions"] {
--_speed-dial-stagger: calc(var(--helix-duration-fast) / 3);
}

[part="actions"][data-placed] ::slotted(:nth-last-child(2)) {
transition-delay: var(--_speed-dial-stagger);
}

[part="actions"][data-placed] ::slotted(:nth-last-child(3)) {
transition-delay: calc(var(--_speed-dial-stagger) * 2);
}

[part="actions"][data-placed] ::slotted(:nth-last-child(4)) {
transition-delay: calc(var(--_speed-dial-stagger) * 3);
}

[part="actions"][data-placed] ::slotted(:nth-last-child(n + 5)) {
transition-delay: calc(var(--_speed-dial-stagger) * 4);
}

[part="actions"][data-placement^="bottom"][data-placed] ::slotted(:nth-child(2)) {
transition-delay: var(--_speed-dial-stagger);
}

[part="actions"][data-placement^="bottom"][data-placed] ::slotted(:nth-child(3)) {
transition-delay: calc(var(--_speed-dial-stagger) * 2);
}

[part="actions"][data-placement^="bottom"][data-placed] ::slotted(:nth-child(4)) {
transition-delay: calc(var(--_speed-dial-stagger) * 3);
}

[part="actions"][data-placement^="bottom"][data-placed] ::slotted(:nth-child(n + 5)) {
transition-delay: calc(var(--_speed-dial-stagger) * 4);
}

@media (prefers-reduced-motion: reduce) {
[part="actions"] ::slotted(*) {
opacity: 1;
scale: 1;
transition: none;
transition-delay: 0s;
translate: 0 0;
}

[part="trigger"] {
transition: none;
}
}

[part="trigger"] {
all: unset;
--icon-size: var(--helix-size-icon-md);

align-items: center;

background-color: var(--helix-color-primary-surface);
block-size: var(--helix-size-control);
border-radius: var(--helix-radii-full);
box-shadow: var(--helix-shadow-md);
box-sizing: border-box;
color: var(--helix-color-foreground-on-accent);
cursor: pointer;
display: inline-flex;
inline-size: var(--helix-size-control);
justify-content: center;
transition: box-shadow var(--helix-duration-fast) var(--helix-easing-standard);
}

[part="trigger"]:hover {
box-shadow: var(--helix-shadow-lg);
}

[part="trigger"]:active {
box-shadow: var(--helix-shadow-sm);
}

[part="trigger"]:focus-visible {
outline: var(--helix-size-focus-ring) solid var(--helix-color-focus-ring);
outline-offset: var(--helix-size-focus-offset);
}

@media print {
:host {
display: none;
}
}`);var tV=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},S$=class W extends J8{static{this.styles=[A0,M$]}};S$=tV([G("helix-speed-dial")],S$);var R$=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},f9=class W extends A{constructor(){super(...arguments);this.label=""}willUpdate(J){super.willUpdate(J),L(this.internals,{label:this.label,role:"group"})}render(){return F`<slot></slot>`}};R$([q()],f9.prototype,"label",void 0);f9=R$([G("helix-headless-stat-group")],f9);var E$=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},j9=class W extends A{render(){return F`<slot name="label"></slot>
      <slot></slot>
      <slot name="unit"></slot>`}};E$([q({reflect:!0})],j9.prototype,"direction",void 0);j9=E$([G("helix-headless-stat")],j9);var w$=N(`:host {
display: flex;
flex-wrap: wrap;
gap: var(--stat-group-gap, var(--helix-space-2xl));
}

:host([divided]) ::slotted(*:not(:first-child)) {
border-inline-start: var(--helix-border-thin) solid var(--helix-color-border);
padding-inline-start: var(--stat-group-gap, var(--helix-space-2xl));
}`);var b$=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},fY=class W extends f9{constructor(){super(...arguments);this.divided=!1}static{this.styles=w$}};b$([q({reflect:!0,type:Boolean})],fY.prototype,"divided",void 0);fY=b$([G("helix-stat-group")],fY);var f$=N(`:host {

align-content: start;

align-items: baseline;
display: grid;
gap: var(--helix-space-2xs);
grid-template-columns: auto 1fr;
}

slot[name="label"]::slotted(*) {
color: var(--helix-color-foreground-muted);
font-size: calc(var(--helix-text-xs) / var(--helix-text-md) * 1em);
font-weight: var(--helix-weight-medium);
grid-column: 1 / -1;
letter-spacing: var(--helix-tracking-wide);
}

slot:not([name]) {
color: var(--helix-color-foreground);
font-family: var(--helix-font-display);
font-size: var(--stat-value-size, calc(var(--helix-text-3xl) / var(--helix-text-md) * 1em));
font-weight: var(--helix-weight-semibold);
letter-spacing: var(--helix-tracking-tight);
line-height: var(--helix-leading-tight);
}

slot[name="unit"]::slotted(*) {
color: var(--helix-color-foreground-muted);
font-size: calc(var(--helix-text-md) / var(--helix-text-md) * 1em);
font-weight: var(--helix-weight-medium);
}

:host([direction="column-reverse"]) slot[name="label"]::slotted(*) {
order: 1;
}

:host([direction="row"]),
:host([direction="row-reverse"]) {
align-items: baseline;
display: flex;
gap: var(--helix-space-xs);
}

:host([direction="row"]) slot[name="label"]::slotted(*),
:host([direction="row-reverse"]) slot[name="label"]::slotted(*) {
grid-column: auto;
}

:host([direction="row-reverse"]) slot[name="label"] {
order: 1;
}

@media print {
:host {
box-shadow: none;
}
}`);var eV=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},j$=class W extends j9{static{this.styles=f$}};j$=eV([G("helix-stat")],j$);var M4=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},Z8=class W extends t1(A){constructor(){super(...arguments);this.label="Steps",this.handleSelection=(J)=>{this.requestActive(J.detail.value)},this.handleSlotChange=()=>{this.sync()}}get steps(){return[...this.querySelectorAll(":scope > *")].filter((J)=>("current"in J))}sync(){if(this.active==="")return;let J=this.steps,Z=this.resolveActive(J)?.value??"";for(let K of J)K.current=K.value===Z}connectedCallback(){super.connectedCallback(),this.addEventListener("helix-select",this.handleSelection)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("helix-select",this.handleSelection)}willUpdate(J){super.willUpdate(J),L(this.internals,{label:this.label,role:"list"})}updated(J){if(super.updated(J),J.has("active"))this.sync()}render(){return F`<slot @slotchange=${this.handleSlotChange}></slot>`}};M4([q()],Z8.prototype,"label",void 0);M4([q({reflect:!0})],Z8.prototype,"orientation",void 0);M4([q({reflect:!0})],Z8.prototype,"variant",void 0);Z8=M4([G("helix-headless-steps")],Z8);var _9=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},X7=class W extends A{constructor(){super(...arguments);this.complete=!1,this.current=!1,this.disabled=!1,this.value=""}select(){if(this.disabled)return;this.dispatchEvent(new m({value:this.value}))}renderMarker(){let J=this.complete?JJ:this.current?m8:y8;return T`<slot name="marker"
      ><svg part="mark" fill="currentColor" viewBox=${J.viewBox}
        >${S(J.content)}</svg
      ></slot
    >`}willUpdate(J){super.willUpdate(J),L(this.internals,{role:"listitem"}),this.internals.ariaCurrent=this.current?"step":null}renderLabel(){return T`<${this.tag("button")}
      part="label"
      exportparts="button: label-button"
      appearance="ghost"
      ?disabled=${this.disabled}
      @click=${this.select}
    >
      <slot></slot>
    </${this.tag("button")}>`}render(){return T`<span part="lead" aria-hidden="true"></span>
      <span part="trail" aria-hidden="true"></span>
      <span part="marker" aria-hidden="true">
        ${this.renderMarker()}
      </span>
      <span part="body">
        ${this.renderLabel()}
        <span part="description"><slot name="description"></slot></span>
      </span>
      <div part="content"><slot name="content"></slot></div>`}};_9([q({reflect:!0,type:Boolean})],X7.prototype,"complete",void 0);_9([q({reflect:!0,type:Boolean})],X7.prototype,"current",void 0);_9([q({reflect:!0,type:Boolean})],X7.prototype,"disabled",void 0);_9([q()],X7.prototype,"value",void 0);X7=_9([G("helix-headless-step")],X7);var _$=N(`:host {
counter-reset: helix-step;
display: flex;
gap: var(--steps-gap, var(--helix-space-md));

--_steps-m: var(--steps-marker-size, var(--helix-size-icon));
--_steps-mark-box: var(--_steps-m);

--_steps-connector-inset: var(--steps-connector-inset, var(--helix-space-2xs));
--_steps-columns: minmax(0, 1fr);
--_steps-marker-column: 1;
--_steps-marker-justify: center;
--_steps-body-column: 1;
--_steps-body-row: 2;
--_steps-body-align: center;
--_steps-row-gap: var(--helix-space-xs);
--_steps-content: none;

--_steps-lead-inline-start: calc(var(--steps-gap, var(--helix-space-md)) / -2);
--_steps-lead-inline-size: calc(
50% +
var(--steps-gap, var(--helix-space-md)) /
2 -
var(--_steps-mark-box) /
2 -
var(--_steps-connector-inset)
);
--_steps-lead-block-start: calc(var(--_steps-mark-box) / 2);
--_steps-lead-block-size: var(--helix-border-thin);
--_steps-trail-inline-start: calc(
50% +
var(--_steps-mark-box) /
2 +
var(--_steps-connector-inset)
);
--_steps-trail-inline-size: calc(
50% +
var(--steps-gap, var(--helix-space-md)) /
2 -
var(--_steps-mark-box) /
2 -
var(--_steps-connector-inset)
);
--_steps-trail-block-start: calc(var(--_steps-mark-box) / 2);
--_steps-trail-block-size: var(--helix-border-thin);
}

:host(:not([orientation="vertical"])) ::slotted(*) {
flex: 1 1 0;
min-inline-size: 0;
}

:host([orientation="vertical"]) {
flex-direction: column;

--_steps-mark-box: var(--helix-size-control-sm);
--_steps-columns: auto minmax(0, 1fr);
--_steps-marker-justify: start;
--_steps-body-column: 2;
--_steps-body-row: 1;
--_steps-body-align: start;
--_steps-row-gap: var(--helix-space-2xs);
--_steps-content: grid;

--_steps-lead-inline-start: calc(var(--_steps-mark-box) / 2);
--_steps-lead-inline-size: var(--helix-border-thin);
--_steps-lead-block-start: calc(var(--steps-gap, var(--helix-space-md)) / -2);
--_steps-lead-block-size: calc(var(--steps-gap, var(--helix-space-md)) / 2);
--_steps-trail-inline-start: calc(var(--_steps-mark-box) / 2);
--_steps-trail-inline-size: var(--helix-border-thin);
--_steps-trail-block-start: var(--_steps-mark-box);
--_steps-trail-block-size: calc(
100% -
var(--_steps-mark-box) +
var(--steps-gap, var(--helix-space-md)) /
2
);
}

:host([variant="numeric"]) {
--_steps-mark: none;
--_steps-count: counter(helix-step);
--_steps-marker-color: var(--helix-color-foreground-subtle);
--_steps-ink-complete: var(--helix-color-foreground-muted);
--_steps-ink-current: var(--helix-color-foreground);
}

@media print {
:host {
box-shadow: none;
}
}`);var JF=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},v$=class W extends Z8{static{this.styles=_$}};v$=JF([G("helix-steps")],v$);var k$=N(`:host {
align-items: start;
column-gap: var(--helix-space-2xs);
counter-increment: helix-step;
display: grid;
flex: 0 0 auto;
grid-template-columns: var(--_steps-columns, minmax(0, 1fr));
min-inline-size: 0;
position: relative;
row-gap: var(--_steps-row-gap, var(--helix-space-2xs));

--_step-inset: var(--helix-space-sm);
}

[part="lead"],
[part="trail"] {
background-color: var(--steps-connector-color, var(--helix-color-border));
position: absolute;
z-index: 0;
}

[part="lead"] {
block-size: var(--_steps-lead-block-size, var(--helix-border-thin));
inline-size: var(--_steps-lead-inline-size, 0);
inset-block-start: var(--_steps-lead-block-start, 50%);
inset-inline-start: var(--_steps-lead-inline-start, 0);
}

[part="trail"] {
block-size: var(--_steps-trail-block-size, var(--helix-border-thin));
inline-size: var(--_steps-trail-inline-size, 0);
inset-block-start: var(--_steps-trail-block-start, 50%);
inset-inline-start: var(--_steps-trail-inline-start, 0);
}

:host(:first-child) [part="lead"],
:host(:last-child) [part="trail"] {
display: none;
}

[part="marker"] {
align-items: center;
grid-column: var(--_steps-marker-column, 1);
grid-row: 1;
justify-self: var(--_steps-marker-justify, center);
block-size: var(--_steps-mark-box, var(--helix-size-icon));
box-sizing: border-box;
color: var(--_steps-marker-color, var(--helix-color-border));
display: inline-flex;
flex: 0 0 auto;
font-family: var(--helix-font-sans);
font-size: var(--helix-text-xs);
font-weight: var(--helix-weight-semibold);
inline-size: var(--_steps-mark-box, var(--helix-size-icon));
justify-content: center;
position: relative;
transition: color var(--helix-duration-fast) var(--helix-easing-standard);
z-index: 1;
}

[part="marker"] slot {
align-items: center;
display: inline-flex;
justify-content: center;
}

[part="marker"]::after {
content: var(--_steps-count, none);
}

[part="marker"] svg {
block-size: var(--_steps-m, var(--helix-size-icon));
display: var(--_steps-mark, inline);
flex: 0 0 auto;
inline-size: var(--_steps-m, var(--helix-size-icon));
}

slot[name="marker"]::slotted(*) {
--icon-size: var(--_steps-m, var(--helix-size-icon));
}

:host([complete]) [part="marker"] {
color: var(--steps-complete-color, var(--_steps-ink-complete, var(--helix-color-success)));
}

:host([current]) [part="marker"] {
color: var(--steps-current-color, var(--_steps-ink-current, var(--helix-color-primary)));
}

:host([complete][current]) [part="marker"] {
color: var(--steps-complete-color, var(--_steps-ink-complete, var(--helix-color-success)));
}

[part="body"] {
align-items: var(--_steps-body-align, center);
grid-column: var(--_steps-body-column, 1);
grid-row: var(--_steps-body-row, 2);
display: flex;
flex-direction: column;
min-inline-size: 0;
position: relative;
z-index: 1;
}

[part="label"] {
--helix-size-control: var(--helix-size-control-sm);
--helix-size-icon: var(--helix-size-icon-sm);
--helix-space-control: var(--_step-inset);
--helix-text-control: var(--helix-text-sm);
--button-foreground-color: var(--helix-color-foreground-muted);

max-inline-size: 100%;
}

:host([complete]) [part="label"],
:host([current]) [part="label"] {
--button-foreground-color: var(--helix-color-foreground);
}

[part="description"] {
color: var(--helix-color-foreground-subtle);
font-family: var(--helix-font-sans);
font-size: var(--helix-text-xs);
padding-inline: var(--_step-inset);
}

:host([disabled]) [part="marker"],
:host([disabled]) [part="description"] {
opacity: 0.5;
}

[part="content"] {
display: var(--_steps-content, none);
grid-column: var(--_steps-body-column, 1);
grid-row: calc(var(--_steps-body-row, 2) + 1);
grid-template-rows: 0fr;
padding-inline: var(--_step-inset);
transition: grid-template-rows var(--helix-duration-normal) var(--helix-easing-standard);
}

:host([current]) [part="content"] {
grid-template-rows: 1fr;
}

[part="content"] > slot {
display: block;
min-block-size: 0;
overflow: hidden;
}

@media (prefers-reduced-motion: reduce) {
[part="marker"],
[part="content"] {
transition: none;
}
}`);var ZF=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},H$=class W extends X7{static{this.tier="helix-"}static{this.styles=k$}};H$=ZF([G("helix-step")],H$);var u$=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},v9=class W extends h5(k(E)){constructor(){super(...arguments);this.value="on",this.handleChange=(J)=>{J.stopPropagation();let Z=J.target,K=this.requestChecked(Z.checked);if(Z.checked=this.checked,!K)return;this.dispatchEvent(new Event("change",{bubbles:!0,composed:!1}))}}sync(){this.internals.setFormValue(this.checked?this.value:null),this.reportRequired(!this.checked,"Turn this on to continue.","control")}formResetCallback(){this.resetChecked()}updated(J){super.updated(J),this.markEmpty(),this.sync()}markEmpty(){let J=this.renderRoot?.querySelector('[part="label"]'),Z=!o(this.renderRoot?.querySelector('[part="label"] slot'));J?.toggleAttribute("data-empty",Z),J?.toggleAttribute("hidden",Z)}render(){return F`<label part="field">
      <span part="track">
        <input
          part="control"
          type="checkbox"
          role="switch"
          .checked=${this.checked}
          ?disabled=${this.isDisabled}
          ?required=${this.required}
          aria-describedby=${this.describedBy??z}
          @change=${this.handleChange}
          @input=${this.stopInner}
        />
        <span part="thumb" aria-hidden="true"></span>
      </span>
      <span part="label"><slot>${this.label}</slot></span>
    </label>
    ${this.renderHint()}${this.renderFeedback()}`}};u$([q()],v9.prototype,"value",void 0);v9=u$([G("helix-headless-switch")],v9);var h$=N(`:host {
display: inline-flex;
flex-direction: column;
gap: var(--helix-space-2xs);

--_switch-height: var(--switch-height, var(--helix-size-switch));

--_switch-width: var(--switch-width, calc(var(--_switch-height) * 1.75));

--_switch-inset: calc(var(--helix-space-2xs) / 2);

--_field-control-inline-size: var(--_switch-width);
}

[part="field"] {
align-items: center;
cursor: pointer;
display: inline-flex;
gap: var(--helix-space-xs);
}

:host(:disabled) [part="field"] {
cursor: default;
}

:host(:disabled) {
opacity: 0.5;
}

[part="track"] {
background-color: var(--helix-color-surface-sunken);
block-size: var(--_switch-height);
border: var(--helix-border-thin) solid var(--helix-color-border);
border-radius: var(--helix-radii-full);
display: grid;
flex: 0 0 auto;
inline-size: var(--_switch-width);
position: relative;
transition:
background-color var(--helix-duration-fast) var(--helix-easing-standard),
border-color var(--helix-duration-fast) var(--helix-easing-standard);
}

[part="thumb"] {

background-color: var(--switch-thumb-color, var(--helix-color-surface-overlay));
block-size: calc(var(--_switch-height) - var(--_switch-inset) * 2);
border: var(--helix-border-thin) solid var(--helix-color-border);
border-radius: var(--helix-radii-full);
inline-size: calc(var(--_switch-height) - var(--_switch-inset) * 2);
inset-block-start: 50%;

inset-inline-start: calc(var(--_switch-inset) - var(--helix-border-thin));
pointer-events: none;
position: absolute;
translate: 0 -50%;
transition: translate var(--helix-duration-fast) var(--helix-easing-emphasized);
}

:host(:state(checked)) [part="thumb"] {
border-color: transparent;
}

:host(:state(checked)) [part="track"] {
background-color: var(--switch-on-color, var(--helix-color-primary));
border-color: var(--switch-on-color, var(--helix-color-primary));
}

[part="control"] {
appearance: none;
block-size: 100%;
cursor: inherit;
grid-area: 1 / 1;
inline-size: 100%;
margin: var(--helix-space-none);
opacity: 0;
}

:host(:state(checked)) [part="thumb"] {

background-color: var(--switch-thumb-color, var(--helix-color-foreground-on-accent));

translate: calc(var(--_switch-width) - var(--_switch-height)) -50%;
}

[part="control"]:focus-visible + [part="thumb"] {
outline: var(--helix-size-focus-ring) solid var(--helix-color-focus-ring);
outline-offset: var(--helix-size-focus-offset);
}

:host(:state(invalid)) [part="track"] {
border-color: var(--helix-color-danger);
}

@media (prefers-reduced-motion: reduce) {
[part="thumb"],
[part="track"] {
transition: none;
}
}

[part="label"][data-empty] {
display: none;
}

@media print {
:host {
box-shadow: none;
print-color-adjust: exact;
}
}`);var YF=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},x$=class W extends v9{static{this.styles=[y,m6,h$]}};x$=YF([G("helix-switch")],x$);var S4=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},IJ=class W extends A{constructor(){super(...arguments);this.value="",this.selected=!1,this.label=""}willUpdate(J){super.willUpdate(J),this.toggleState("selected",this.selected)}render(){return F`<div
      part="panel"
      role="tabpanel"
      aria-label=${this.label||z}
      ?hidden=${!this.selected}
      tabindex="0"
    >
      <slot></slot>
    </div>`}};S4([q()],IJ.prototype,"value",void 0);S4([q({type:Boolean})],IJ.prototype,"selected",void 0);S4([q({attribute:!1})],IJ.prototype,"label",void 0);IJ=S4([G("helix-headless-tab-panel")],IJ);var R4=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},TJ=class W extends A{constructor(){super(...arguments);this.value="",this.selected=!1,this.disabled=!1}focusItem(){this.renderRoot.querySelector('[part="tab"]')?.focus()}select(){if(this.disabled)return;this.dispatchEvent(new m({value:this.value}))}willUpdate(J){super.willUpdate(J),this.toggleState("selected",this.selected)}render(){return F`<button
      part="tab"
      role="tab"
      type="button"
      aria-selected=${this.selected?"true":"false"}
      ?disabled=${this.disabled}
      tabindex=${this.selected?"0":"-1"}
      @click=${()=>this.select()}
    >
      <slot></slot>
    </button>`}};R4([q()],TJ.prototype,"value",void 0);R4([q({type:Boolean})],TJ.prototype,"selected",void 0);R4([q({reflect:!0,type:Boolean})],TJ.prototype,"disabled",void 0);TJ=R4([G("helix-headless-tab")],TJ);var E4=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},Y8=class W extends t1(A){constructor(){super(...arguments);this.keys=new b0(this,{items:()=>this.tabs,origin:"focus",selects:()=>!this.manual}),this.indicator=new u1(this,{active:()=>this.tabs.find((J)=>J.selected),indicator:()=>this.renderRoot?.querySelector('[part="indicator"]'),surface:()=>this.renderRoot?.querySelector('[part="tabs"]')}),this.label="Tabs",this.manual=!1,this.handleSelection=(J)=>{this.requestActive(J.detail.value)},this.handleSlotChange=()=>{this.sync(),this.watch(),this.indicator.place()}}get tabs(){return[...this.children].filter((J)=>J instanceof TJ)}get panels(){return[...this.children].filter((J)=>J instanceof IJ)}sync(){let J=this.tabs,Z=this.resolveActive(J)?.value??"";for(let Q of J)Q.selected=Q.value===Z;let K=new Map(J.map((Q)=>[Q.value,(Q.textContent??"").trim()]));for(let Q of this.panels)Q.selected=Q.value===Z,Q.label=K.get(Q.value)??""}connectedCallback(){if(super.connectedCallback(),this.addEventListener("helix-select",this.handleSelection),this.hasUpdated)this.measure(),this.watch()}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("helix-select",this.handleSelection),this.observer?.disconnect(),this.observer=void 0}firstUpdated(J){super.firstUpdated(J),this.sync(),this.indicator.place(),requestAnimationFrame(()=>this.indicator.place()),this.measure(),this.watch()}measure(){this.observer?.disconnect(),this.observer=new ResizeObserver(()=>this.indicator.place()),this.observer.observe(this)}watch(){for(let J of this.tabs)this.observer?.observe(J)}updated(J){if(super.updated(J),J.has("active"))this.sync();this.indicator.place()}render(){return F`<div part="tabs" role="tablist" aria-label=${this.label}>
        <slot @slotchange=${this.handleSlotChange}></slot>
        <span part="indicator" aria-hidden="true"></span>
      </div>
      <div part="panels"><slot name="panels" @slotchange=${this.handleSlotChange}></slot></div>`}};E4([q({reflect:!0})],Y8.prototype,"variant",void 0);E4([q()],Y8.prototype,"label",void 0);E4([q({reflect:!0,type:Boolean})],Y8.prototype,"manual",void 0);Y8=E4([G("helix-headless-tabs")],Y8);var y$=N(`:host {

display: contents;
}

[part="panel"] {
min-block-size: 0;
min-inline-size: 0;
outline: none;
padding-block-start: var(--helix-space-md);
}

[part="panel"][hidden] {
display: none;
}`);var WF=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},m$=class W extends IJ{static{this.styles=y$}};m$=WF([G("helix-tab-panel")],m$);var p$=N(`:host {

--_tabs-rule: none;
--_tab-radius: var(--helix-radii-sm);
--_tab-selected-shadow: var(--helix-shadow-sm);
--_tab-selected-surface: var(--helix-color-surface-raised);

display: grid;

grid-template-rows: auto minmax(0, 1fr);
min-block-size: 0;
}

[part="tabs"] {
background-image: var(--_tabs-rule, none);
background-position: bottom;
background-repeat: repeat-x;
background-size: 100% var(--helix-border-thin);
display: flex;
gap: var(--helix-space-2xs);
overflow-x: auto;
}

:host([variant="underlined"]) {
--_tabs-rule: linear-gradient(var(--helix-color-border), var(--helix-color-border));
--_tab-radius: var(--helix-radii-none);
--_tab-selected-shadow: none;
--_tab-selected-surface: transparent;
}

:host([variant="segmented"]) [part="tabs"] {

--_tab-selected-surface: var(--helix-color-surface-overlay);

--_tab-height: 100%;

background-color: var(--helix-color-surface-sunken);
block-size: var(--helix-size-control);
border: var(--helix-border-thin) solid var(--helix-color-border);
border-radius: var(--helix-radii-sm);
justify-self: start;
padding: var(--helix-space-2xs);
inline-size: fit-content;
}

[part="panels"] {
display: grid;
grid-template-rows: minmax(0, 1fr);
min-block-size: 0;
min-inline-size: 0;
}

[part="indicator"] {
background-color: var(--_indicator-color, transparent);
block-size: var(--_indicator-block, var(--helix-border-thick));

border: var(--_indicator-border, 0) solid var(--_indicator-border-color, transparent);
border-radius: var(--_indicator-radius, var(--helix-radii-none));
box-shadow: var(--_indicator-shadow, none);
inline-size: var(--indicator-width, 0);
inset-block-start: 0;
inset-inline-start: 0;
opacity: 0;
position: absolute;

translate: var(--indicator-x, 0) calc(var(--indicator-y, 0px) + var(--_indicator-offset, 0px));

transition:
translate var(--helix-duration-normal) var(--helix-easing-emphasized),
inline-size var(--helix-duration-normal) var(--helix-easing-emphasized),
opacity var(--helix-duration-fast) var(--helix-easing-standard);
z-index: var(--helix-layer-base);
}

[part="indicator"][data-placed] {
opacity: 1;
}

[part="tabs"] {
position: relative;
}

::slotted(helix-tab) {
position: relative;
z-index: var(--helix-layer-raised);
}

@media (prefers-reduced-motion: reduce) {
[part="indicator"] {
transition: opacity var(--helix-duration-fast) var(--helix-easing-standard);
}
}

:host([variant="underlined"]) [part="indicator"] {
--_indicator-block: var(--helix-border-thick);
--_indicator-color: var(--helix-color-primary);
--_indicator-offset: calc(var(--indicator-height, 0px) - var(--helix-border-thick));
}

:host([variant="segmented"]) [part="indicator"] {
--_indicator-block: var(--indicator-height, 0);
--_indicator-color: var(--helix-color-surface-overlay);
--_indicator-radius: calc(var(--helix-radii-sm) - var(--helix-border-thin));
--_indicator-shadow: var(--helix-shadow-sm);
--_indicator-offset: 0px;
}

:host([variant="segmented"]) {
--_tab-selected-surface: transparent;
}

:host(:not([variant])) [part="indicator"] {
--_indicator-block: var(--indicator-height, 0);

--_indicator-border: var(--helix-border-thin);
--_indicator-border-color: var(--helix-color-border);
--_indicator-color: var(--helix-color-surface-overlay);
--_indicator-radius: var(--helix-radii-sm);
--_indicator-shadow: var(--helix-shadow-sm);
--_indicator-offset: 0px;
}

:host(:not([variant])) {
--_tab-selected-surface: transparent;
--_tab-selected-shadow: none;
}

@media print {
:host {
box-shadow: none;
max-block-size: none;
overflow: visible;
}
}`);var KF=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},g$=class W extends Y8{static{this.styles=p$}};g$=KF([G("helix-tabs")],g$);var n$=N(`:host {
display: inline-flex;
}

[part="tab"] {
align-items: center;
background-color: var(--_tab-surface, transparent);

block-size: var(--_tab-height, var(--helix-size-control));
border: none;

border-block-end: var(--helix-border-thick) solid transparent;
border-radius: var(--_tab-radius, var(--helix-radii-none));
color: var(--helix-color-foreground-subtle);
cursor: pointer;
font: inherit;
font-size: var(--helix-text-sm);
font-weight: var(--helix-weight-medium);
display: inline-flex;
justify-content: center;
padding-inline: var(--helix-space-sm);
transition:
background-color var(--helix-duration-fast) var(--helix-easing-standard),
border-color var(--helix-duration-normal) var(--helix-easing-emphasized),
color var(--helix-duration-fast) var(--helix-easing-standard);
white-space: nowrap;
}

[part="tab"]:hover:not(:disabled) {
background-color: color-mix(in oklab, var(--helix-color-foreground) 5%, transparent);
color: var(--helix-color-foreground);
}

:host(:state(selected)) [part="tab"],
:host(:state(selected)) [part="tab"]:hover {
background-color: var(--_tab-selected-surface, transparent);
box-shadow: var(--_tab-selected-shadow, none);
color: var(--helix-color-foreground);
}

[part="tab"]:disabled {
cursor: not-allowed;
opacity: 0.5;
}

[part="tab"]:focus-visible {
outline: var(--helix-size-focus-ring) solid var(--helix-color-focus-ring);
outline-offset: calc(var(--helix-size-focus-offset) * -1);
}

@media (prefers-reduced-motion: reduce) {
[part="tab"] {
transition: none;
}
}`);var QF=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},l$=class W extends TJ{static{this.styles=n$}};l$=QF([G("helix-tab")],l$);var c$=N(`:host {
display: inline;
}

:host([as="p"]),
:host([as="h1"]),
:host([as="h2"]),
:host([as="h3"]),
:host([as="h4"]),
:host([as="h5"]),
:host([as="h6"]) {
display: block;
}

:host([variant="display"]),
:host(:not([variant])[as="h1"]) {
font-family: var(--helix-font-display);
font-size: var(--helix-text-3xl);
font-weight: var(--helix-weight-semibold);
letter-spacing: var(--helix-tracking-tight);
line-height: var(--helix-leading-heading);
}

:host([variant="heading"]),
:host(:not([variant])[as="h2"]) {
font-family: var(--helix-font-sans);
font-size: var(--helix-text-2xl);
font-weight: var(--helix-weight-semibold);
letter-spacing: var(--helix-tracking-tight);
line-height: var(--helix-leading-heading);
}

:host([variant="subheading"]),
:host(:not([variant])[as="h3"]) {
font-family: var(--helix-font-sans);
font-size: var(--helix-text-xl);
font-weight: var(--helix-weight-semibold);
letter-spacing: var(--helix-tracking-tight);
line-height: var(--helix-leading-heading);
}

:host([variant="title"]),
:host(:not([variant])[as="h4"]) {
font-family: var(--helix-font-sans);
font-size: var(--helix-text-lg);
font-weight: var(--helix-weight-semibold);
letter-spacing: var(--helix-tracking-normal);
line-height: var(--helix-leading-heading);
}

:host([variant="body"]) {
font-family: var(--helix-font-sans);
font-size: var(--helix-text-md);
font-weight: var(--helix-weight-regular);
letter-spacing: var(--helix-tracking-normal);
line-height: var(--helix-leading-normal);
}

:host([variant="body-strong"]),
:host(:not([variant])[as="h5"]),
:host(:not([variant])[as="h6"]),
:host(:not([variant])[as="strong"]) {
font-family: var(--helix-font-sans);
font-size: var(--helix-text-md);
font-weight: var(--helix-weight-medium);
letter-spacing: var(--helix-tracking-normal);
line-height: var(--helix-leading-normal);
}

:host([variant="caption"]) {
font-family: var(--helix-font-sans);
font-size: var(--helix-text-sm);
font-weight: var(--helix-weight-regular);
letter-spacing: var(--helix-tracking-normal);
line-height: var(--helix-leading-normal);
}

:host([variant="label"]),
:host(:not([variant])[as="label"]) {
font-family: var(--helix-font-sans);
font-size: var(--helix-text-xs);
font-weight: var(--helix-weight-medium);
letter-spacing: var(--helix-tracking-wide);
line-height: var(--helix-leading-normal);
}

:host([variant="code"]),
:host(:not([variant])[as="code"]) {
font-family: var(--helix-font-mono);
font-size: var(--helix-text-xs);
font-weight: var(--helix-weight-regular);
letter-spacing: var(--helix-tracking-normal);
line-height: var(--helix-leading-normal);
}

[part="text"] {
color: inherit;
font: inherit;
letter-spacing: inherit;
margin: var(--helix-space-none);
}

:host([as="em"]) [part="text"] {
font-style: italic;
}

@media print {
:host {
box-shadow: none;
}
}`);var w4=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},d$={code:f0`code`,em:f0`em`,h1:f0`h1`,h2:f0`h2`,h3:f0`h3`,h4:f0`h4`,h5:f0`h5`,h6:f0`h6`,label:f0`label`,p:f0`p`,span:f0`span`,strong:f0`strong`},k9=class W extends A{render(){let J=(this.as&&Object.hasOwn(d$,this.as)?d$[this.as]:void 0)??f0`span`;return T`<${J} part="text"><slot></slot></${J}>`}static{this.styles=c$}};w4([q({reflect:!0})],k9.prototype,"as",void 0);w4([q({reflect:!0})],k9.prototype,"variant",void 0);w4([q({reflect:!0})],k9.prototype,"tone",void 0);k9=w4([G("helix-text")],k9);var E1=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},m0=class W extends u(k(E)){constructor(){super(...arguments);this.announcesInput=!0,this.autocomplete="",this.autoGrow=!1,this.placeholder="",this.readOnly=!1,this.rows=3,this.dirName="",this.wrap="soft",this.handleInput=(J)=>{J.stopPropagation();let Z=J.target,K=Z.value;this.requestValue(K),Q0(Z,this.value),this.grow()},this.handleChange=(J)=>{J.stopPropagation(),this.dispatchEvent(new Event("change",{bubbles:!0,composed:!1}))}}static{this.shadowRootOptions={...E.shadowRootOptions,delegatesFocus:!0}}get control(){return this.renderRoot.querySelector('[part="control"]')}grow(){let J=this.control;if(!this.autoGrow||!J)return;J.style.blockSize="auto";let Z=J.scrollHeight;if(Z===0)return;J.style.blockSize=`${Z}px`}formValue(){let J=this.control;if(!this.dirName||!this.name||!J)return this.value;let Z=new FormData;return Z.append(this.name,this.value),Z.append(this.dirName,getComputedStyle(J).direction==="rtl"?"rtl":"ltr"),Z}get selectionDirection(){return this.control?.selectionDirection??"none"}set selectionDirection(J){let Z=this.control;if(Z)Z.selectionDirection=J}get selectionEnd(){return this.control?.selectionEnd??0}set selectionEnd(J){let Z=this.control;if(Z)Z.selectionEnd=J}get selectionStart(){return this.control?.selectionStart??0}set selectionStart(J){let Z=this.control;if(Z)Z.selectionStart=J}setSelectionRange(J,Z,K){this.control?.setSelectionRange(J,Z,K)}get textLength(){return this.value.length}get type(){return"textarea"}focus(J){this.control?.focus(J)}sync(){this.internals.setFormValue(this.formValue());let J=this.control;if(!J)return;this.internals.setValidity(J.validity,J.validationMessage,J),this.refreshFeedback()}connectedCallback(){if(super.connectedCallback(),this.hasUpdated)this.watchControl()}disconnectedCallback(){super.disconnectedCallback(),this.resize?.disconnect(),this.resize=void 0}firstUpdated(J){super.firstUpdated(J),this.watchControl()}watchControl(){let J=this.control;if(!J)return;this.resize?.disconnect(),this.resize=new ResizeObserver(()=>this.grow()),this.resize.observe(J)}willUpdate(J){if(super.willUpdate(J),!this.hasUpdated)return;let Z=this.control;if(J.has("value")&&Z&&this.shadowRoot?.activeElement===Z)this.releaseCaret=S7(Z)}updated(J){super.updated(J),this.releaseCaret?.(),this.releaseCaret=void 0,this.sync(),this.grow()}render(){return F`${this.renderLabel()}
    <div part="field">
      <textarea
        part="control"
        id="control"
        .value=${this.value}
        rows=${this.rows}
        cols=${this.cols??z}
        wrap=${this.wrap}
        name=${this.name||z}
        placeholder=${this.placeholder||z}
        autocomplete=${this.autocomplete||z}
        minlength=${this.minLength??z}
        maxlength=${this.maxLength??z}
        aria-describedby=${this.describedBy??z}
        ?disabled=${this.isDisabled}
        ?readonly=${this.readOnly}
        ?required=${this.required}
        @input=${this.handleInput}
        @change=${this.handleChange}
      ></textarea>
    </div>
    ${this.renderHint()}${this.renderFeedback()}`}};E1([q()],m0.prototype,"autocomplete",void 0);E1([q({attribute:"auto-grow",reflect:!0,type:Boolean})],m0.prototype,"autoGrow",void 0);E1([q()],m0.prototype,"placeholder",void 0);E1([q({attribute:"read-only",reflect:!0,type:Boolean})],m0.prototype,"readOnly",void 0);E1([q({type:Number})],m0.prototype,"rows",void 0);E1([q({type:Number})],m0.prototype,"cols",void 0);E1([q({attribute:"dirname"})],m0.prototype,"dirName",void 0);E1([q()],m0.prototype,"wrap",void 0);E1([q({attribute:"minlength",type:Number})],m0.prototype,"minLength",void 0);E1([q({attribute:"maxlength",type:Number})],m0.prototype,"maxLength",void 0);m0=E1([G("helix-headless-textarea")],m0);var i$=N(`:host {
display: flex;
flex-direction: column;
gap: var(--helix-space-2xs);
}

[part="field"] {
background-color: var(--textarea-background-color, var(--helix-color-well));
border: var(--helix-border-thin) solid var(--helix-color-border);
border-radius: var(--helix-radii-sm);
display: flex;
padding: var(--helix-space-xs);
transition:
border-color var(--helix-duration-fast) var(--helix-easing-standard),
background-color var(--helix-duration-fast) var(--helix-easing-standard);
}

:host(:not(:disabled)) [part="field"]:hover {
border-color: var(--helix-color-primary);
}

:host(:focus-within) [part="field"],
:host(:focus-within) [part="field"]:hover {
border-color: var(--helix-color-primary);
outline: var(--helix-size-focus-ring) solid var(--helix-color-focus-ring);
outline-offset: 0;
}

:host(:state(invalid)) [part="field"],
:host(:state(invalid)) [part="field"]:hover,
:host(:state(invalid):focus-within) [part="field"],
:host(:state(invalid):focus-within) [part="field"]:hover {
border-color: var(--helix-color-danger);
outline-color: var(--helix-color-danger);
}

[part="control"] {
all: unset;

box-sizing: border-box;
overflow-wrap: break-word;
color: var(--helix-color-foreground);
font-family: var(--helix-font-sans);
font-size: var(--helix-text-sm);
font-weight: var(--helix-weight-medium);
inline-size: 100%;
line-height: var(--helix-leading-normal);

resize: vertical;
}

:host([auto-grow]) [part="control"] {
overflow: hidden;
resize: none;
}

:host(:disabled) [part="field"] {
cursor: not-allowed;
opacity: 0.5;
}

:host([read-only]) [part="field"] {
background-color: transparent;
}

@media (prefers-reduced-motion: reduce) {
[part="field"] {
transition: none;
}
}

@media print {
:host {
box-shadow: none;
print-color-adjust: exact;
}
}`);var XF=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},s$=class W extends m0{static{this.styles=[y,l,i$]}};s$=XF([G("helix-textarea")],s$);var G1=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},W8=(W)=>/^([01]\d|2[0-3]):[0-5]\d$/.test(W),c1=(W)=>{if(!W8(W))return null;let[J="0",Z="0"]=W.split(":");return Number(J)*60+Number(Z)},H9=(W)=>{let J=(Math.round(W)%1440+1440)%1440;return`${String(Math.floor(J/60)).padStart(2,"0")}:${String(J%60).padStart(2,"0")}`},u9=(W,J)=>{let Z=c1(W);if(Z===null)return W;let K=new Date(Date.UTC(2000,0,1,Math.floor(Z/60),Z%60));return new Intl.DateTimeFormat(J||void 0,{timeStyle:"short",timeZone:"UTC"}).format(K)},a$=(W)=>new Intl.DateTimeFormat(W||void 0,{timeStyle:"short"}).resolvedOptions().hour12===!0,R0=class W extends u(E){constructor(){super(...arguments);this.invalid=!1,this.step=15,this.min="00:00",this.max="23:59",this.disableTimes="",this.locale="",this.label="Time",this.handleChange=(J)=>{if(J.stopPropagation(),this.isDisabled)return;let Z=J.detail.value;if(Z.split(",").some((X)=>this.barred(X.trim())))return;if(this.mode!=="range"){this.requestValue(Z);return}let K=Z.split(",").map((X)=>X.trim()).filter(Boolean);if(K.length<=2){this.requestValue(K.sort().join(","));return}let Q=new Set(this.held),Y=K.find((X)=>!Q.has(X));this.requestValue(Y??"")},this.moveColumn=(J,Z)=>{if(this.isDisabled)return;let{hour:K,meridiem:Q,minute:Y}=this.parts,X=K*60+Y;if(J==="minute")X=K*60+Number(Z);else if(J==="hour"){let V=Number(Z);X=(a$(this.locale)?V%12+(Q==="PM"?12:0):V)*60+Y}else X=(K%12+(Z==="PM"?12:0))*60+Y;let $=H9(X);if(this.barred($))return;this.requestValue($)},this.readOnly=!1,this.required=!1}get times(){let J=c1(this.min)??0,Z=c1(this.max)??1439,K=Math.max(1,Math.round(this.step)),Q=[];for(let Y=J;Y<=Z;Y+=K)Q.push(Y);return Q}barred(J){return this.disableTimes.split(",").map((Z)=>Z.trim()).filter(Boolean).includes(J)}wholeHourBarred(J,Z){let K=Z===void 0?J:J%12+(Z==="PM"?12:0),Q=this.times.filter((Y)=>Math.floor(Y/60)===K);return Q.length>0&&Q.every((Y)=>this.barred(H9(Y)))}halfBarred(J){let Z=this.times.filter((K)=>J==="PM"===K>=720);return Z.length>0&&Z.every((K)=>this.barred(H9(K)))}get held(){return this.value.split(",").map((J)=>J.trim()).filter(Boolean)}between(J){if(this.mode!=="range")return!1;let[Z,K]=this.held;return Z!==void 0&&K!==void 0&&J>Z&&J<K}get parts(){let J=c1(this.value)??c1(this.min)??0,Z=Math.floor(J/60);return{hour:Z,meridiem:Z<12?"AM":"PM",minute:J%60}}get hours(){return[...new Set(this.times.map((Z)=>Math.floor(Z/60)))]}get minutes(){let J=this.parts.hour;return this.times.filter((Z)=>Math.floor(Z/60)===J).map((Z)=>Z%60)}reveal(){if(this.variant!=="wheels"||this.mode!==void 0)return;for(let J of this.renderRoot?.querySelectorAll('[part="column"]')??[])J.reveal?.()}requestValue(J){if(this.readOnly)return!1;return super.requestValue(J)}reportRequired(){if(this.required&&this.value==="")this.internals.setValidity({valueMissing:!0},"Choose a time.",this.renderRoot?.querySelector('[part="list"]')??void 0);else this.internals.setValidity({})}async revealWhenSettled(){let J=[...this.renderRoot?.querySelectorAll('[part="column"]')??[]];await Promise.all(J.map((Z)=>Z.updateComplete)),this.reveal()}willUpdate(J){super.willUpdate(J),this.internals.ariaInvalid=this.invalid?"true":null}updated(J){super.updated(J),this.reportRequired(),this.reveal(),this.revealWhenSettled()}focus(J){this.renderRoot?.querySelector('[part="list"]')?.focus(J)}renderColumn(J,Z,K,Q,Y,X=()=>!1){return T`<${this.tag("listbox")}
      part="column"
      data-column=${J}
      exportparts="empty: column-empty, feedback: column-feedback, filter-icon: column-filter-icon,
        filter-mark: column-filter-mark, hint: column-hint, items: column-items, label: column-label,
        loading: column-loading, search: column-search, search-field: column-search-field"
      aria-label=${Z}
      ?disabled=${this.isDisabled}
      .value=${Y}
      @helix-before-change=${($)=>{$.stopPropagation(),this.moveColumn(J,$.detail.value)}}
    >
      ${K.map(($)=>T`<${this.tag("option")} part="option"
          exportparts="description: option-description, item: option-item, label: option-label, text: option-text" value=${$} ?disabled=${X($)}
            >${Q($)}</${this.tag("option")}
          >`)}
    </${this.tag("listbox")}>`}renderSpinner(){let J=a$(this.locale),{hour:Z,meridiem:K,minute:Q}=this.parts,Y=J?String(Z%12===0?12:Z%12):String(Z),X=J?[...new Set(this.hours.map(($)=>$%12===0?12:$%12))].sort(($,V)=>$-V):this.hours;return T`<div part="columns" data-unset=${this.value===""?"":z}>
      ${this.renderColumn("hour","Hour",X.map(String),($)=>J?$:$.padStart(2,"0"),Y,($)=>this.wholeHourBarred(Number($),J?K:void 0))}
      ${this.renderColumn("minute","Minute",this.minutes.map(String),($)=>$.padStart(2,"0"),String(Q),($)=>this.barred(H9(Z*60+Number($))))}
      ${J?this.renderColumn("meridiem","Before or after noon",["AM","PM"],($)=>$,K,($)=>this.halfBarred($)):z}
    </div>`}renderList(){return T`<${this.tag("listbox")}
      part="list"
      exportparts="empty: list-empty, feedback: list-feedback, filter-icon: list-filter-icon,
        filter-mark: list-filter-mark, hint: list-hint, items: list-items, label: list-label,
        loading: list-loading, search: list-search, search-field: list-search-field"
      aria-label=${this.label}
      data-unset=${this.value===""?"":z}
      ?disabled=${this.isDisabled}
      ?multiple=${this.mode!==void 0}
      .value=${this.value}
      @helix-before-change=${this.handleChange}
    >
      ${this.times.map((J)=>{let Z=H9(J);return T`<${this.tag("option")}
          part="option"
      exportparts="description: option-description, item: option-item, label: option-label, text: option-text"
          value=${Z}
          ?disabled=${this.barred(Z)}
          data-between=${this.between(Z)?"":z}
          >${u9(Z,this.locale)}</${this.tag("option")}
        >`})}
    </${this.tag("listbox")}>`}render(){if(this.variant==="wheels"&&this.mode===void 0)return this.renderSpinner();return T`${this.renderList()}`}get valueAsDate(){return f7(this.value)}set valueAsDate(J){this.value=j7(J)}get valueAsNumber(){return f7(this.value)?.getTime()??Number.NaN}set valueAsNumber(J){this.value=Number.isNaN(J)?"":j7(new Date(J))}};G1([q({reflect:!0,type:Boolean})],R0.prototype,"invalid",void 0);G1([q({type:Number})],R0.prototype,"step",void 0);G1([q()],R0.prototype,"min",void 0);G1([q()],R0.prototype,"max",void 0);G1([q({attribute:"disable-times"})],R0.prototype,"disableTimes",void 0);G1([q()],R0.prototype,"locale",void 0);G1([q()],R0.prototype,"label",void 0);G1([q({reflect:!0})],R0.prototype,"mode",void 0);G1([q({reflect:!0})],R0.prototype,"variant",void 0);G1([q({attribute:"read-only",reflect:!0,type:Boolean})],R0.prototype,"readOnly",void 0);G1([q({reflect:!0,type:Boolean})],R0.prototype,"required",void 0);R0=G1([G("helix-headless-time-picker")],R0);var E0=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},G0=class W extends g(u(k(E))){constructor(){super(...arguments);this.autocomplete="",this.maxTags=0,this.step=15,this.min="00:00",this.max="23:59",this.timeStyle="local",this.locale="",this.placeholder="HH:mm",this.triggerLabel="Choose a time",this.editing=!1,this.panel=new d(this,{anchor:()=>this.renderRoot?.querySelector('[part="field"]'),boundary:()=>[this.renderRoot?.querySelector('[part="surface"]'),this.renderRoot?.querySelector('[part="trigger"]')],offset:()=>8,onDismiss:()=>this.requestOpen(!1),placement:"bottom-start",surface:()=>this.renderRoot?.querySelector('[part="surface"]')}),this.draft="",this.handleDraftKey=(J)=>{if(this.mode!=="multiple")return;let Z=this.held;if(J.key==="Enter"&&W8(this.draft)){if(J.preventDefault(),!Z.includes(this.draft))this.requestValue([...Z,this.draft].sort().join(","));this.draft=""}else if(J.key==="Backspace"&&this.draft===""&&Z.length>0)this.requestValue(Z.slice(0,-1).join(","))},this.removeTime=(J)=>{this.requestValue(this.held.filter((Z)=>Z!==J).join(","))},this.handleInput=(J)=>{J.stopPropagation(),this.editing=!0;let Z=J.target.value;if(this.mode==="multiple"){this.draft=Z;return}let K=Z.replace(/\s+[–-]\s+/g,",").split(",").map((Y)=>Y.trim()).filter(Boolean),Q=K.length>0&&K.every(W8);this.requestValue(Q?K.join(","):Z),this.restore()},this.handlePicked=(J)=>{if(J.stopPropagation(),this.requestValue(J.detail.value),this.restore(),this.mode===void 0)this.requestOpen(!1),this.updateComplete.then(()=>this.returnFocus())},this.returning=!1,this.handleBlur=()=>{this.editing=!1},this.handleFocus=(J)=>{this.editing=!this.returning;let Z=J.relatedTarget;if(this.open||this.isDisabled||this.returning)return;if(Z instanceof Node&&this.renderRoot?.contains?.(Z))return;this.requestOpen(!0)},this.handleKeydown=(J)=>{if(J.key==="Escape"&&this.open)J.stopPropagation(),this.requestOpen(!1),this.returnFocus()},this.readOnly=!1}get control(){if(typeof this.renderRoot?.querySelector!=="function")return null;return this.renderRoot.querySelector('[part="control"]')}get held(){return this.value.replace(/\s+[–-]\s+/g,",").split(",").map((J)=>J.trim()).filter(Boolean)}written(J){return this.timeStyle==="iso"||!W8(J)?J:u9(J,this.locale)}get display(){if(this.mode==="multiple")return this.draft;let J=this.held;if(this.editing||this.timeStyle==="iso")return this.mode==="range"&&J.length===2?J.join(" – "):this.value;let Z=J.map((K)=>this.written(K));return this.mode==="range"?Z.join(" – "):Z.join(", ")}get shownTimes(){let J=this.held;return this.maxTags>0?J.slice(0,this.maxTags):J}get restCount(){return Math.max(0,this.held.length-this.shownTimes.length)}get picked(){let J=this.held;return J.length>0&&J.every(W8)?J.join(","):""}returnFocus(){this.returning=!0,this.control?.focus(),this.returning=!1}restore(){let J=this.control;if(J&&J.value!==this.display)J.value=this.display;this.sync()}sync(){this.internals.setFormValue(this.value);let J=this.control;if(!J)return;let Z=this.value,K="";if(Z!==""&&!W8(Z))K="Enter a time as HH:mm.";else if(Z!==""&&c1(Z)<(c1(this.min)??0))K=`Choose a time at or after ${u9(this.min,this.locale)}.`;else if(Z!==""&&c1(Z)>(c1(this.max)??1439))K=`Choose a time at or before ${u9(this.max,this.locale)}.`;if(K==="")this.internals.setValidity(J.validity,J.validationMessage,J);else this.internals.setValidity({badInput:!0},K,J);this.refreshFeedback()}requestValue(J){if(this.readOnly)return!1;return super.requestValue(J)}firstUpdated(J){super.firstUpdated(J),this.sync()}updated(J){if(super.updated(J),J.has("value"))this.sync();if(this.open)this.panel.show(),this.renderRoot?.querySelector('[part="picker"]')?.reveal?.();else this.panel.hide()}focus(J){this.control?.focus(J)}renderPicker(){return T`<${this.tag("time-picker")}
      part="picker"
      exportparts="column: picker-column, column-empty: picker-column-empty,
        column-feedback: picker-column-feedback, column-filter-icon: picker-column-filter-icon,
        column-filter-mark: picker-column-filter-mark, column-hint: picker-column-hint,
        column-items: picker-column-items, column-label: picker-column-label,
        column-loading: picker-column-loading, column-search: picker-column-search,
        column-search-field: picker-column-search-field, columns: picker-columns, list: picker-list,
        list-empty: picker-list-empty, list-feedback: picker-list-feedback,
        list-filter-icon: picker-list-filter-icon, list-filter-mark: picker-list-filter-mark,
        list-hint: picker-list-hint, list-items: picker-list-items, list-label: picker-list-label,
        list-loading: picker-list-loading, list-search: picker-list-search,
        list-search-field: picker-list-search-field, option: picker-option,
        option-description: picker-option-description, option-item: picker-option-item,
        option-label: picker-option-label, option-text: picker-option-text"
      ?invalid=${this.resolvedFeedback!==""}
      mode=${this.mode??z}
      appearance=${this.variant??z}
      label=${this.label||"Time"}
      locale=${this.locale||z}
      max=${this.max}
      min=${this.min}
      step=${this.step}
      .value=${this.picked}
      @helix-before-change=${this.handlePicked}
      @change=${this.stopInner}
      @input=${this.stopInner}
    ></${this.tag("time-picker")}>`}renderTag(J){return T`<${this.tag("tag")}
                  part="time"
      exportparts="dismiss: time-dismiss, dismiss-mark: time-dismiss-mark, prefix: time-prefix"
                  dismissible
                  dismiss-label=${`Remove ${this.written(J)}`}
                  ?disabled=${this.isDisabled}
                  @helix-dismiss=${(Z)=>{Z.stopPropagation(),this.removeTime(J)}}
                  >${this.written(J)}</${this.tag("tag")}
                >`}renderTrigger(){return T`<slot name="trigger"><svg aria-hidden="true" fill="currentColor" part="trigger-icon" viewBox=${l5.viewBox}>
        ${S(l5.content)}
      </svg></slot>`}render(){return T`${this.renderLabel()}
      <div part="field" @keydown=${this.handleKeydown}>
        ${this.mode==="multiple"?this.shownTimes.map((J)=>this.renderTag(J)):z}
        ${this.restCount>0?T`<span part="rest">${`+${this.restCount}`}</span>`:z}
        <input
          part="control"
          id="control"
          type="text"
          .value=${this.display}
          name=${this.name||z}
          placeholder=${this.mode==="multiple"&&this.held.length>0?z:this.placeholder||z}
          autocomplete=${this.autocomplete||z}
          aria-describedby=${this.describedBy??z}
          ?disabled=${this.isDisabled}
          ?readonly=${this.readOnly}
          ?required=${this.required}
          @blur=${this.handleBlur}
          @focus=${this.handleFocus}
          @input=${this.handleInput}
          @keydown=${this.handleDraftKey}
        />
        <button
          part="trigger"
          type="button"
          aria-controls="surface"
          aria-expanded=${this.open?"true":"false"}
          aria-haspopup="listbox"
          aria-label=${this.triggerLabel}
          ?disabled=${this.isDisabled}
          @click=${()=>this.toggleOpen()}
        >
          ${this.renderTrigger()}
        </button>
      </div>

      <div part="surface" id="surface" popover="manual" ?hidden=${!this.open}>
        ${this.renderPicker()}
      </div>
      ${this.renderHint()}${this.renderFeedback()}`}get valueAsDate(){return f7(this.value)}set valueAsDate(J){this.value=j7(J)}get valueAsNumber(){return f7(this.value)?.getTime()??Number.NaN}set valueAsNumber(J){this.value=Number.isNaN(J)?"":j7(new Date(J))}};E0([q()],G0.prototype,"autocomplete",void 0);E0([q({reflect:!0})],G0.prototype,"variant",void 0);E0([q({reflect:!0})],G0.prototype,"mode",void 0);E0([q({attribute:"max-tags",type:Number})],G0.prototype,"maxTags",void 0);E0([q({type:Number})],G0.prototype,"step",void 0);E0([q()],G0.prototype,"min",void 0);E0([q()],G0.prototype,"max",void 0);E0([q({attribute:"time-style"})],G0.prototype,"timeStyle",void 0);E0([q()],G0.prototype,"locale",void 0);E0([q()],G0.prototype,"placeholder",void 0);E0([q({attribute:"trigger-label"})],G0.prototype,"triggerLabel",void 0);E0([U()],G0.prototype,"editing",void 0);E0([U()],G0.prototype,"draft",void 0);E0([q({attribute:"read-only",reflect:!0,type:Boolean})],G0.prototype,"readOnly",void 0);G0=E0([G("helix-headless-time-input")],G0);var o$=N(`:host {
display: block;
}

[part="list"] {
--listbox-max-block-size: var(--time-picker-list-height, 16rem);

display: block;
}

[part="list"]::part(items) {
background-color: transparent;
border: none;
border-radius: var(--helix-radii-none);
padding-block: var(--helix-space-none);
}

:host([mode="range"]) [part="option"]:state(selected)::part(item) {

background-color: var(--helix-color-surface-inverse);
color: var(--helix-color-foreground-inverse);
}

[part="option"][data-between]::part(item) {
background-color: var(
--time-picker-range-color,
light-dark(
color-mix(in oklab, var(--helix-color-foreground) 10%, transparent),
color-mix(in oklab, var(--helix-color-foreground) 14%, transparent)
)
);
}

[part="option"][data-between]::part(item)::after {
content: "";
background-color: currentColor;
block-size: var(--helix-size-icon-sm);
border-radius: var(--helix-radii-full);
flex: 0 0 auto;
inline-size: var(--helix-size-icon-sm);
margin-inline-start: auto;
opacity: 0.4;
scale: 0.3;
}

[part="columns"] {
display: flex;
}

[part="column"] {

--_time-row: var(--time-picker-row-size, var(--helix-size-control));
--listbox-max-block-size: var(--time-picker-wheel-height, calc(var(--_time-row) * 5));

flex: 1 1 auto;
min-inline-size: max-content;
}

[part="column"]::part(items) {
background-color: transparent;
border: none;
border-radius: var(--helix-radii-none);

mask-image: linear-gradient(to bottom, transparent, black 25%, black 75%, transparent);
padding-block: calc((var(--listbox-max-block-size) - var(--_time-row)) / 2);
scroll-snap-type: y mandatory;

scrollbar-width: none;
}

[part="column"] [part="option"] {
scroll-snap-align: center;
}

[part="column"] [part="option"]::part(item) {
justify-content: center;
}

[part="column"] [part="option"]::part(label) {
text-align: center;
}

[part="column"] [part="option"]::part(item) {
min-block-size: var(--_time-row);
min-inline-size: var(--_time-row);

padding-block: var(--helix-space-none);
padding-inline: var(--helix-space-sm);
}

[part="column"] [part="option"]::part(item) {
background-color: transparent;
}

[part="column"] [part="option"]::part(label) {
align-items: center;
block-size: var(--_time-row);

border-radius: var(--helix-radii-sm);
display: inline-flex;
justify-content: center;
min-inline-size: var(--_time-row);
padding-inline: var(--helix-space-2xs);
transition: background-color var(--helix-duration-fast) var(--helix-easing-standard);
}

[part="column"] [part="option"]:not([disabled]):hover::part(label),
[part="column"] [part="option"][data-active]::part(label) {
background-color: var(--helix-color-surface-sunken);
}

[part="column"] [part="option"]:state(selected)::part(label) {
background-color: var(--time-picker-selected-color, var(--helix-color-foreground-muted));
color: var(--helix-color-foreground-on-accent);
}

@media (prefers-reduced-motion: reduce) {
[part="column"] [part="option"]::part(label) {
transition: none;
}
}

[part="column"] [part="option"]::part(item)::after {
content: none;
}

:host([invalid]) [part="option"]:state(selected)::part(item),
:host([invalid]) [part="column"] [part="option"]:state(selected)::part(label) {
outline: var(--helix-size-focus-ring) solid var(--helix-color-danger);
outline-offset: var(--helix-size-focus-offset);
}

:host([invalid]) [part="list"][data-unset],
:host([invalid]) [part="columns"][data-unset] {
border-radius: var(--helix-radii-sm);
outline: var(--helix-size-focus-ring) solid var(--helix-color-danger);
outline-offset: var(--helix-size-focus-offset);
}

@media print {
:host {
box-shadow: none;
print-color-adjust: exact;
}
}`);var $F=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},r$=class W extends R0{static{this.tier="helix-"}static{this.styles=o$}};r$=$F([G("helix-time-picker")],r$);var t$=N(`:host {
display: block;
}

[part="field"] {
align-items: center;
background-color: var(--time-input-background-color, var(--helix-color-well));
flex-wrap: wrap;
min-block-size: var(--helix-size-control);
padding-block: var(--helix-space-2xs);
border: var(--helix-border-thin) solid var(--helix-color-border);
border-radius: var(--helix-radii-sm);
display: flex;
gap: var(--helix-space-2xs);
padding-inline: var(--helix-space-xs);
transition:
background-color var(--helix-duration-fast) var(--helix-easing-standard),
border-color var(--helix-duration-fast) var(--helix-easing-standard);
}

[part="control"] {
all: unset;
box-sizing: border-box;
color: var(--helix-color-foreground);
flex: 1 1 auto;
font-family: var(--helix-font-sans);
font-size: var(--helix-text-md);
font-weight: var(--helix-weight-medium);
min-inline-size: 0;
}

:host(:not(:disabled)) [part="field"]:hover {
border-color: var(--helix-color-primary);
}

:host(:focus-within) [part="field"],
:host(:focus-within) [part="field"]:hover {
border-color: var(--helix-color-primary);
outline: var(--helix-size-focus-ring) solid var(--helix-color-focus-ring);
outline-offset: 0;
}

:host(:disabled) [part="field"] {
color: var(--helix-color-foreground-subtle);
}

[part="trigger"] {
all: unset;
--icon-size: var(--helix-size-icon);

align-items: center;
color: var(--helix-color-foreground-muted);
cursor: pointer;
display: flex;
flex: none;
transition: color var(--helix-duration-fast) var(--helix-easing-standard);
}

:host(:not([mode="multiple"])) [part="field"] {
flex-wrap: nowrap;
}

[part="trigger-icon"] {
block-size: var(--icon-size);
inline-size: var(--icon-size);
}

[part="trigger"]:hover {
color: var(--helix-color-foreground);
}

[part="trigger"]:focus-visible {
outline: var(--helix-size-focus-ring) solid var(--helix-color-focus-ring);
outline-offset: var(--helix-size-focus-offset);
}

:host(:disabled) [part="trigger"] {
cursor: not-allowed;
}

[part="surface"] {
background-color: var(--helix-color-surface-overlay);
border: var(--time-input-border-width, var(--helix-border-floating)) solid
var(--time-input-border-color, var(--helix-color-border));
border-radius: var(--helix-radii-sm);
box-shadow: var(--time-input-shadow, var(--helix-shadow-floating));
inline-size: var(--floating-anchor-width, 100%);
inset: auto;
margin: var(--helix-space-none);
min-inline-size: max-content;

overflow: hidden;
padding-block: var(--helix-space-2xs);
padding-inline: var(--helix-space-none);
position: absolute;
}

[part="surface"] {
--_travel: calc(var(--helix-space-2xs) * -1);
opacity: 0;
scale: 0.96;
transform: translateY(var(--_travel));
transition:
opacity var(--helix-duration-fast) var(--helix-easing-standard),
scale var(--helix-duration-fast) var(--helix-easing-emphasized),
transform var(--helix-duration-fast) var(--helix-easing-emphasized),
display var(--helix-duration-fast) allow-discrete,
overlay var(--helix-duration-fast) allow-discrete;
}

[part="surface"][data-placement^="top"] {
--_travel: var(--helix-space-2xs);
transform-origin: var(--floating-arrow-x, 50%) 100%;
}

[part="surface"][data-placement^="bottom"] {
transform-origin: var(--floating-arrow-x, 50%) 0;
}

[part="surface"][data-placed] {
opacity: 1;
scale: 1;
transform: none;
}

[part="surface"][hidden] {
display: none;
}

@media (prefers-reduced-motion: reduce) {
[part="field"],
[part="trigger"] {
transition: none;
}

[part="surface"],
[part="surface"][data-placed] {
scale: 1;
transform: none;
transition: none;
}
}

:host([variant="wheels"]) [part="surface"] {
inline-size: max-content;
}

[part="time"] {
flex: none;
}

:host([mode="multiple"]) [part="control"] {

flex-basis: 0;
min-inline-size: var(--helix-size-icon-lg);
}

[part="rest"] {
color: var(--helix-color-foreground-subtle);
flex: none;
align-self: center;

font-family: var(--helix-font-sans);
font-size: var(--helix-text-xs);
font-weight: var(--helix-weight-medium);
white-space: nowrap;
}

:host(:state(invalid)) [part="field"],
:host(:state(invalid)) [part="field"]:hover,
:host(:state(invalid):focus-within) [part="field"],
:host(:state(invalid):focus-within) [part="field"]:hover {
border-color: var(--helix-color-danger);
outline-color: var(--helix-color-danger);
}

@media print {
:host {
box-shadow: none;
print-color-adjust: exact;
}
}`);var qF=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},e$=class W extends G0{static{this.tier="helix-"}static{this.styles=[y,l,t$]}};e$=qF([G("helix-time-input")],e$);var jY=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},O5=class W extends A{constructor(){super(...arguments);this.datetime=""}willUpdate(J){super.willUpdate(J),L(this.internals,{role:"listitem"})}renderMarker(){let J=this.tone===void 0?y8:m8;return F`<span part="marker"
      ><slot name="marker"
        ><svg part="dot" fill="currentColor" viewBox=${J.viewBox} aria-hidden="true">
          ${S(J.content)}
        </svg></slot
      ></span
    >`}render(){let J=F`<slot name="time"></slot>`;return F`<div part="rail">
        <div
          part="connector"
          aria-hidden="true"
        ></div>
        ${this.renderMarker()}
      </div>
      ${this.datetime===""?F`<span part="time">${J}</span>`:F`<time
              part="time"
              datetime=${this.datetime}
              >${J}</time
            >`}
      <div part="content"><slot></slot></div>`}};jY([q()],O5.prototype,"datetime",void 0);jY([q({reflect:!0})],O5.prototype,"tone",void 0);O5=jY([G("helix-headless-timeline-item")],O5);var Jq=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},h9=class W extends A{constructor(){super(...arguments);this.label=""}render(){return F`<slot></slot>`}willUpdate(J){super.willUpdate(J),L(this.internals,{label:this.label,role:"list"})}};Jq([q()],h9.prototype,"label",void 0);h9=Jq([G("helix-headless-timeline")],h9);var Zq=N(`:host {
column-gap: var(--helix-space-md);
display: grid;
grid-template-columns: auto minmax(0, 1fr);
grid-template-rows: auto minmax(0, 1fr);
}

[part="rail"] {
display: grid;
grid-row: 1 / -1;
grid-template-rows: subgrid;
justify-items: center;
}

[part="connector"] {
background-color: var(--helix-color-border);
block-size: 100%;
grid-row: 1;
inline-size: var(--timeline-rail-size, var(--helix-border-thin));
}

:host(:first-child) [part="connector"] {
visibility: hidden;
}

[part="rail"]::after {
align-self: stretch;
background-color: var(--helix-color-border);
content: "";

grid-column: 1;
grid-row: 2;
inline-size: var(--timeline-rail-size, var(--helix-border-thin));
margin-block-start: var(--timeline-marker-size, var(--helix-size-icon-md));
}

:host(:last-child) [part="rail"]::after {
visibility: hidden;
}

[part="marker"] {
--icon-size: var(--helix-size-icon-sm);

align-items: center;
align-self: start;
aspect-ratio: 1;

border-radius: var(--timeline-marker-radius, var(--helix-radii-full));
color: var(--_timeline-tone, var(--helix-color-foreground-subtle));
display: inline-flex;
grid-column: 1;
grid-row: 2;
inline-size: var(--timeline-marker-size, var(--helix-size-icon-md));
justify-content: center;
}

[part="dot"] {

block-size: var(--helix-size-icon-sm);
inline-size: var(--helix-size-icon-sm);
}

:host([tone="danger"]) {
--_timeline-tone: var(--helix-color-danger);
}

:host([tone="info"]) {
--_timeline-tone: var(--helix-color-info);
}

:host([tone="neutral"]) {
--_timeline-tone: var(--helix-color-foreground-muted);
}

:host([tone="primary"]) {
--_timeline-tone: var(--helix-color-primary);
}

:host([tone="success"]) {
--_timeline-tone: var(--helix-color-success);
}

:host([tone="warning"]) {
--_timeline-tone: var(--helix-color-warning);
}

[part="time"] {
color: var(--helix-color-foreground-muted);
font-family: var(--helix-font-sans);
font-size: var(--helix-text-xs);
font-weight: var(--helix-weight-medium);
grid-column: 2;
grid-row: 1;
padding-block-end: var(--helix-space-2xs);
}

[part="content"] {
display: flex;
flex-direction: column;
gap: var(--helix-space-2xs);
grid-column: 2;
grid-row: 2;
min-inline-size: 0;
padding-block-end: var(--timeline-gap, var(--helix-space-lg));
}

:host(:last-child) [part="content"] {
padding-block-end: var(--helix-space-none);
}`);var GF=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},Yq=class W extends O5{static{this.styles=Zq}};Yq=GF([G("helix-timeline-item")],Yq);var Wq=N(`:host {
display: flex;
flex-direction: column;
}

@media print {
:host {
box-shadow: none;
}
}`);var zF=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},Kq=class W extends h9{static{this.styles=Wq}};Kq=zF([G("helix-timeline")],Kq);var b4=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},K8=class W extends T7(A){constructor(){super(...arguments);this.openState=void 0,this.holds=0,this.handlePause=()=>{this.holds+=1,this.pause()},this.handleResume=()=>{if(this.holds=Math.max(this.holds-1,0),this.holds===0)this.resume()}}get open(){return this.openState??!0}set open(J){let Z=this.open;this.openState=J,this.requestUpdate("open",Z)}dismiss(){if(!this.open)return!0;return clearTimeout(this.timer),this.timer=void 0,h({apply:()=>{let J=this.open;this.openState=!1,this.requestUpdate("open",J)},event:()=>this.dismissEvent(),host:this,next:!1})}pause(){if(this.timer===void 0||this.startedAt===void 0)return;clearTimeout(this.timer),this.timer=void 0,this.remaining=Math.max((this.remaining??0)-(Date.now()-this.startedAt),0),this.startedAt=void 0,this.toggleAttribute("data-paused",!0)}resume(){if(this.timer!==void 0||this.remaining===void 0||this.remaining<=0)return;this.startedAt=Date.now(),this.toggleAttribute("data-paused",!1),this.timer=setTimeout(()=>{this.timer=void 0,this.dismiss()},this.remaining)}disconnectedCallback(){super.disconnectedCallback(),clearTimeout(this.timer),this.timer=void 0}willUpdate(J){super.willUpdate(J),this.toggleAttribute("data-closed",!this.open),this.toggleAttribute("hidden",!this.open)}firstUpdated(J){if(super.firstUpdated(J),this.duration!==void 0&&this.duration>0)this.remaining=this.duration,this.resume()}renderIcon(J){return F`<slot name="icon">
      <svg part="icon-mark"
        fill="currentColor"
        viewBox=${J.icon.viewBox}
        role="img"
        aria-label=${J.label}
      >
        ${S(J.icon.content)}
      </svg>
    </slot>`}renderDismissIcon(){return F`<slot name="dismiss-icon">
      <svg part="dismiss-mark" viewBox=${B0.viewBox} fill="currentColor" aria-hidden="true">
        ${S(B0.content)}
      </svg>
    </slot>`}render(){let J=t5(this.tone);return F`<div
      part="item"
      @mouseenter=${this.handlePause}
      @mouseleave=${this.handleResume}
      @focusin=${this.handlePause}
      @focusout=${this.handleResume}
    >
      ${J?F`<span part="icon">
              ${this.renderIcon(J)}
            </span>`:z}
      <div part="content"><slot></slot></div>
      <div part="actions"><slot name="actions"></slot></div>
      ${this.dismissible?F`<button
              part="dismiss"
              type="button"
              aria-label=${this.dismissLabel}
              @click=${()=>this.dismiss()}
            >
              ${this.renderDismissIcon()}
            </button>`:z}
      ${this.duration?F`<div
              part="timer"
              style=${`--toast-duration: ${this.duration}ms`}
              aria-hidden="true"
            ></div>`:z}
    </div>`}};b4([q({type:Number})],K8.prototype,"duration",void 0);b4([q({reflect:!0})],K8.prototype,"tone",void 0);b4([q({type:Boolean})],K8.prototype,"open",null);K8=b4([G("helix-headless-toast-item")],K8);var _Y=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},B5=class W extends A{constructor(){super(...arguments);this.label="Notifications"}willUpdate(J){super.willUpdate(J),L(this.internals,{label:this.label,role:"status"}),this.internals.ariaLive="polite",this.internals.ariaRelevant="additions",this.internals.ariaAtomic="false"}render(){return F`<div part="region"><slot></slot></div>`}};_Y([q()],B5.prototype,"label",void 0);_Y([q({reflect:!0})],B5.prototype,"placement",void 0);B5=_Y([G("helix-headless-toast")],B5);var Qq=N(`:host {

display: grid;

grid-template-rows: minmax(0, 1fr);

margin-block-start: var(--_toast-gap, var(--helix-space-xs));
transition:
grid-template-rows var(--helix-duration-normal) var(--helix-easing-standard),
margin-block-start var(--helix-duration-normal) var(--helix-easing-standard),
opacity var(--helix-duration-fast) var(--helix-easing-standard),
translate var(--helix-duration-normal) var(--helix-easing-standard);

--helix-size-icon: var(--helix-size-icon-sm);
--helix-size-control: var(--helix-size-control-sm);

--_toast-line: calc(var(--helix-text-sm) * var(--helix-leading-normal));

inline-size: var(--toast-inline-size, 22rem);
max-inline-size: calc(100vw - var(--helix-space-xl));
}

[part="item"] {

align-items: start;

display: grid;
grid-template-columns: auto 1fr;
background-color: var(--helix-color-surface-overlay);
border-radius: var(--helix-radii-sm);
border: var(--toast-border-width, var(--helix-border-floating)) solid
var(--toast-border-color, var(--helix-color-border));
box-shadow: var(--toast-shadow, var(--helix-shadow-floating));
box-sizing: border-box;
color: var(--helix-color-foreground);
font-family: var(--helix-font-sans);
font-size: var(--helix-text-sm);
line-height: var(--helix-leading-normal);
padding: var(--toast-item-inset, var(--helix-space-sm));

padding-inline-end: calc(
var(--helix-space-sm) +
var(--helix-size-control-sm) +
var(--helix-space-2xs)
);

min-block-size: 0;

position: relative;

overflow: hidden;
}

[part="icon"] {
color: var(--_toast-severity, var(--helix-color-foreground-muted));
display: inline-flex;
grid-area: 1 / 1;

margin-inline-end: var(--helix-space-sm);

margin-block-start: calc((var(--_toast-line) - var(--helix-size-icon)) / 2);
}

[part="icon"] svg {
block-size: var(--helix-size-icon);
inline-size: var(--helix-size-icon);
}

slot[name="icon"]::slotted(*) {
--icon-size: var(--helix-size-icon);

block-size: var(--helix-size-icon);
inline-size: var(--helix-size-icon);
}

[part="content"] {
grid-area: 1 / 2;
min-inline-size: 0;
}

[part="actions"] {
display: flex;
gap: var(--helix-space-2xs);
grid-area: 2 / 2;
}

[part="actions"] slot::slotted(*) {
margin-block-start: var(--helix-space-xs);
}

:host([tone="info"]) {
--_toast-severity: var(--helix-color-primary);
}

:host([tone="success"]) {
--_toast-severity: var(--helix-color-success);
}

:host([tone="warning"]) {
--_toast-severity: var(--helix-color-warning);
}

:host([tone="danger"]) {
--_toast-severity: var(--helix-color-danger);
}

[part="dismiss"] {
all: unset;

box-sizing: border-box;

position: absolute;
inset-block-start: calc(
var(--toast-item-inset, var(--helix-space-sm)) +
(var(--_toast-line) - var(--helix-size-control-sm)) /
2
);
inset-inline-end: var(--helix-space-sm);
block-size: var(--helix-size-control-sm);
border-radius: var(--helix-radii-sm);
color: var(--helix-color-foreground-muted);
cursor: pointer;
display: inline-flex;
flex: 0 0 auto;
inline-size: var(--helix-size-control-sm);
place-content: center;
place-items: center;
transition: color var(--helix-duration-fast) var(--helix-easing-standard);
}

[part="dismiss"] svg {
block-size: var(--helix-size-icon);
inline-size: var(--helix-size-icon);
}

[part="dismiss"]:hover {
background-color: color-mix(in oklab, var(--helix-color-foreground) 8%, transparent);
color: var(--helix-color-foreground);
}

[part="dismiss"]:focus-visible {
outline: var(--helix-size-focus-ring) solid var(--helix-color-focus-ring);
outline-offset: var(--helix-size-focus-offset);
}

[part="timer"] {
animation: helix-toast-drain var(--toast-duration, 0ms) linear forwards;
background-color: var(--_toast-severity, var(--helix-color-foreground-muted));
block-size: var(--helix-space-2xs);

inset-block-start: 0;
inset-inline: 0;
position: absolute;

transform-origin: 0 50%;
}

[part="timer"]:dir(rtl) {
transform-origin: 100% 50%;
}

:host([data-paused]) [part="timer"] {
animation-play-state: paused;
}

@keyframes helix-toast-drain {
to {
scale: 0 1;
}
}

@media (prefers-reduced-motion: no-preference) {
[part="item"] {

animation: helix-toast-in var(--helix-duration-normal) var(--helix-easing-decelerate) backwards;
}
}

@keyframes helix-toast-in {
from {
opacity: 0;

translate: 0 var(--_toast-enter, var(--helix-space-lg));
}
}

:host([data-closed]) [part="item"] {

padding-block: 0;
transition: padding-block var(--helix-duration-normal) var(--helix-easing-standard);
}

:host([hidden]:not([hidden="until-found"])) {
display: grid;
}

:host([data-closed]) {
grid-template-rows: minmax(0, 0fr);
margin-block-start: 0;
opacity: 0;
translate: 0 var(--_toast-enter, var(--helix-space-lg));
visibility: hidden;
transition:
grid-template-rows var(--helix-duration-normal) var(--helix-easing-standard),
margin-block-start var(--helix-duration-normal) var(--helix-easing-standard),
opacity var(--helix-duration-fast) var(--helix-easing-standard),
translate var(--helix-duration-normal) var(--helix-easing-standard),
visibility var(--helix-duration-normal) step-end;
}

@media (prefers-reduced-motion: reduce) {
[part="item"] {
animation: none;
}

[part="dismiss"] {
transition: none;
}
}

@media (prefers-reduced-motion: reduce) {
:host,
:host([data-closed]),
:host([data-closed]) [part="item"] {
transition: none;
}

[part="timer"] {
animation: helix-toast-drain var(--toast-duration, 0ms) linear forwards;
}
}`);var VF=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},Xq=class W extends K8{static{this.styles=Qq}};Xq=VF([G("helix-toast-item")],Xq);var $q=N(`:host {
--_toast-inset: var(--toast-inset, var(--helix-space-lg));

inset-inline: var(--_toast-inset);
pointer-events: none;
position: fixed;

z-index: var(--helix-layer-toast);
}

:host(:not([placement])) {
inset-block-end: var(--_toast-inset);

--_toast-enter: var(--helix-space-lg);
}

[part="region"] {
display: flex;
flex-direction: column;

--_toast-gap: var(--toast-gap, var(--helix-space-xs));
}

::slotted(*) {
pointer-events: auto;
}

:host([placement^="bottom"]) {
inset-block-end: var(--_toast-inset);

--_toast-enter: var(--helix-space-lg);
}

:host([placement^="top"]) {
inset-block-start: var(--_toast-inset);

--_toast-enter: calc(var(--helix-space-lg) * -1);
}

:host([placement^="top"]) [part="region"] {
flex-direction: column-reverse;
}

:host(:not([placement])) [part="region"] {
align-items: flex-end;
}

:host([placement$="start"]) [part="region"] {
align-items: flex-start;
}

:host([placement$="end"]) [part="region"] {
align-items: flex-end;
}

:host([placement$="center"]) [part="region"] {
align-items: center;
}

@media print {
:host {
display: none;
}
}`);var FF=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},qq=class W extends B5{static{this.styles=$q}};qq=FF([G("helix-toast")],qq);var x9=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},d1=class W extends A{constructor(){super(...arguments);this.value="",this.seeded=this.hasAttribute("selected"),this.selected=!1,this.disabled=!1,this.focusable=!1}get defaultSelected(){return this.seeded}set defaultSelected(J){this.seeded=J}focusItem(){this.renderRoot.querySelector('[part="item"]')?.focus()}select(){if(this.disabled)return;this.dispatchEvent(new m({value:this.value}))}willUpdate(J){super.willUpdate(J),this.toggleState("selected",this.selected)}render(){return F`<button
      part="item"
      type="button"
      role="radio"
      aria-checked=${this.selected?"true":"false"}
      ?disabled=${this.disabled}
      tabindex=${this.selected||this.focusable?"0":"-1"}
      @click=${()=>this.select()}
    >
      <slot></slot>
    </button>`}};x9([q()],d1.prototype,"value",void 0);x9([q({type:Boolean})],d1.prototype,"selected",void 0);x9([q({reflect:!0,type:Boolean})],d1.prototype,"disabled",void 0);x9([q({attribute:!1})],d1.prototype,"focusable",void 0);d1=x9([G("helix-headless-toggle")],d1);var Gq=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},y9=class W extends u(k(E)){constructor(){super(...arguments);this.indicator=new u1(this,{active:()=>this.items.find((J)=>J.value===this.value),indicator:()=>this.renderRoot?.querySelector('[part="indicator"]'),surface:()=>this.renderRoot?.querySelector('[part="track"]')}),this.keys=new b0(this,{items:()=>this.items}),this.cascade=new j1(this,{items:()=>this.items}),this.handleSelection=(J)=>{this.requestValue(J.detail.value)}}sync(){let J=this.items.find((K)=>K.value===this.value),Z=J?void 0:this.items.find((K)=>!K.disabled);for(let K of this.items)K.selected=K===J,K.focusable=K===Z}get items(){return[...this.children].filter((J)=>J instanceof d1)}watch(){this.observer?.observe(this);for(let J of this.items)this.observer?.observe(J)}connectedCallback(){if(super.connectedCallback(),this.addEventListener("helix-select",this.handleSelection),this.hasUpdated)this.measure(),this.watch()}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("helix-select",this.handleSelection),this.observer?.disconnect()}firstUpdated(J){super.firstUpdated(J),this.sync(),this.indicator.place(),this.measure(),this.watch()}measure(){this.observer?.disconnect(),this.observer=new ResizeObserver(()=>this.indicator.place())}updated(J){if(super.updated(J),J.has("value"))this.sync(),this.indicator.place();this.validate(),this.linkHost()}willUpdate(J){super.willUpdate(J),L(this.internals,{label:this.label,role:"radiogroup"}),this.internals.setFormValue(this.value===""?null:this.value)}validate(){this.reportRequired(this.value==="","Choose one to continue.","track")}render(){let J=this.labelPlacement==="start",Z=this.renderGroupLabel();return F`${J?z:Z}
      <div part="row">
        <slot name="start"></slot>
        <div part="track">
        ${J?F`${Z}<div part="divider" aria-hidden="true"></div>`:z}
        <div part="indicator" aria-hidden="true"></div>
        <slot
          @slotchange=${()=>{this.watch(),this.sync(),this.indicator.place()}}
          ></slot>
        </div>
        <slot name="end"></slot>
      </div>
      ${this.renderHint()}${this.renderFeedback()}`}};Gq([q({attribute:"label-placement",reflect:!0})],y9.prototype,"labelPlacement",void 0);y9=Gq([G("helix-headless-toggle-group")],y9);var zq=N(`:host {
display: inline-flex;
flex-direction: column;
gap: var(--helix-space-2xs);
}

:host([label-placement="start"]) [part="label"] {
align-self: center;
margin-block: 0;

padding-block: 0;
padding-inline-start: var(--helix-space-xs);
white-space: nowrap;
}

[part="divider"] {
align-self: center;
background-color: var(--helix-color-border);
block-size: 60%;
flex: none;
inline-size: var(--helix-border-thin);
margin-inline: var(--helix-space-xs);
}

:host([label-placement="start"]) {
align-items: start;
}

[part="track"] {
display: inline-flex;
position: relative;

align-content: flex-start;
flex-wrap: wrap;

min-block-size: var(--helix-size-control);

--_toggle-height: calc(var(--helix-size-control) - var(--helix-space-2xs) * 2);

--_toggle-radius: var(--helix-radii-sm);

padding: var(--helix-space-2xs);

--_indicator-surface: var(--helix-color-surface-raised);
}

:host(:not([separation])) [part="track"],
:host([separation="outlined"]) [part="track"] {
background-color: var(--helix-color-surface-sunken);
border: var(--helix-border-thin) solid var(--helix-color-border);
border-radius: var(--helix-radii-sm);
padding: var(--helix-space-2xs);

--_toggle-radius: calc(var(--helix-radii-sm) - var(--helix-border-thin));

--_toggle-height: calc(
var(--helix-size-control) -
var(--helix-space-2xs) *
2 -
var(--helix-border-thin) *
2
);

--_indicator-surface: var(--helix-color-surface-overlay);
}

::slotted(helix-toggle) {

block-size: var(--_toggle-height);
flex: 1 1 auto;
}

[part="indicator"] {

background-color: var(--toggle-group-indicator-color, var(--_indicator-surface));
block-size: var(--indicator-height, 0);
border-radius: var(--_toggle-radius, var(--helix-radii-sm));
box-shadow: var(--helix-shadow-sm);
inline-size: var(--indicator-width, 0);
inset-block-start: 0;
inset-inline-start: 0;
opacity: 0;
position: absolute;
translate: var(--indicator-x, 0) var(--indicator-y, 0);

transition:
translate var(--helix-duration-normal) var(--helix-easing-emphasized),
inline-size var(--helix-duration-normal) var(--helix-easing-emphasized),
opacity var(--helix-duration-fast) var(--helix-easing-standard);
z-index: var(--helix-layer-base);
}

[part="indicator"][data-placed] {
opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
[part="indicator"] {
transition: opacity var(--helix-duration-fast) var(--helix-easing-standard);
}
}

:host(:state(invalid)) [part="track"] {
outline: var(--helix-size-focus-ring) solid var(--helix-color-danger);
outline-offset: calc(var(--helix-size-focus-offset) * -1);
}

[part="row"] {
align-items: center;
display: flex;
gap: var(--helix-space-sm);
}

[part="row"] [part="track"] {
flex: 1 1 auto;
}`);var Vq=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},vY=class W extends y9{static{this.styles=[y,l,zq]}};Vq([q({reflect:!0})],vY.prototype,"separation",void 0);vY=Vq([G("helix-toggle-group")],vY);var Fq=N(`:host {
block-size: 100%;
display: inline-flex;

position: relative;
z-index: var(--helix-layer-raised);
}

[part="item"] {
all: unset;
box-sizing: border-box;
}

[part="item"]:focus-visible {
outline: var(--helix-size-focus-ring) solid var(--helix-color-focus-ring);
outline-offset: var(--helix-size-focus-offset);
}

@media print {
:host {
display: none;
}
}`);var NF=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},Nq=class W extends d1{static{this.styles=Fq}};Nq=NF([G("helix-toggle")],Nq);var kY=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},OF=new Set(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Home","End"]),Oq=(W)=>("focusable"in W),BF=new Set(["button","checkbox","color","file","image","reset","submit"]),AF=(W)=>{if(W.defaultPrevented)return!0;let J=W.composedPath()[0];if(!(J instanceof HTMLElement))return!1;if(J.isContentEditable||J.localName==="textarea"||J.localName==="select")return!0;return J.localName==="input"&&!BF.has(J.type)},A5=class W extends A{constructor(){super(...arguments);this.label="Toolbar",this.handleFocusIn=(J)=>{let Z=this.controls.find((K)=>K.contains(J.target));if(Z)this.setTabStop(Z)},this.restoreTabStop=()=>{let J=this.controls,Z=J.some((K)=>Oq(K)?K.focusable:K.tabIndex===0);if(J.length>0&&!Z)this.setTabStop(J[0],!1)},this.handleKeydown=(J)=>{let Z=this.axis==="horizontal"?"ArrowRight":"ArrowDown",K=this.axis==="horizontal"?"ArrowLeft":"ArrowUp";if(!OF.has(J.key)||AF(J))return;let Q=this.controls,Y=Q.findIndex((V)=>V.contains(J.target));if(Y===-1)return;let X=Y;if(J.key===Z)X=(Y+1)%Q.length;else if(J.key===K)X=(Y-1+Q.length)%Q.length;else if(J.key==="Home")X=0;else if(J.key==="End")X=Q.length-1;else return;J.preventDefault();let $=Q[X];this.setTabStop($),$?.focus()}}get controls(){return[...this.children].filter((J)=>{if(!(J instanceof HTMLElement))return!1;return!J.hasAttribute("disabled")&&J.getAttribute("aria-hidden")!=="true"})}setTabStop(J,Z=!0){for(let K of this.controls){let Q=K===J;if(Oq(K))K.focusable=Q;else if(Z)K.tabIndex=Q?0:-1}}async claimTabStop(){let J=[...new Set(this.controls.map((Z)=>Z.localName))].filter((Z)=>Z.includes("-"));await Promise.all(J.map((Z)=>customElements.whenDefined(Z))),this.setTabStop(this.controls[0],!1)}get axis(){return this.orientation??"horizontal"}connectedCallback(){super.connectedCallback(),this.addEventListener("keydown",this.handleKeydown),this.addEventListener("focusin",this.handleFocusIn),this.watcher=new MutationObserver(this.restoreTabStop),this.watcher.observe(this,{attributeFilter:["disabled","aria-hidden"],attributes:!0,subtree:!0})}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("keydown",this.handleKeydown),this.removeEventListener("focusin",this.handleFocusIn),this.watcher?.disconnect(),this.watcher=void 0}firstUpdated(J){super.firstUpdated(J),this.claimTabStop()}render(){return F`<div part="toolbar" role="toolbar" aria-label=${this.label} aria-orientation=${this.axis}>
      <slot @slotchange=${()=>this.claimTabStop()}></slot>
    </div>`}};kY([q()],A5.prototype,"label",void 0);kY([q({reflect:!0})],A5.prototype,"orientation",void 0);A5=kY([G("helix-headless-toolbar")],A5);var Bq=N(`:host {

--helix-size-checkbox: var(--helix-size-checkbox-sm);

--helix-size-icon: var(--helix-size-icon-sm);
--helix-size-control: var(--helix-size-control-sm);
--helix-size-tag: var(--helix-size-tag-sm);

display: inline-flex;
}

[part="toolbar"] {
align-items: center;
display: flex;
gap: var(--toolbar-gap, var(--helix-space-2xs));
}

:host([orientation="vertical"]) [part="toolbar"] {
flex-direction: column;
}

@media print {
:host {
display: none;
}
}`);var DF=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},Aq=class W extends A5{static{this.styles=Bq}};Aq=DF([G("helix-toolbar")],Aq);var z1=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},w0=class W extends A{constructor(){super(...arguments);this.open=!1,this.defaultIndex=0,this.indexState=void 0,this.label="",this.spotlightPadding=8,this.backLabel="",this.nextLabel="",this.doneLabel="",this.skipLabel="",this.handleAsk=(J)=>{let Z=J.detail?.what;if(Z==="next")this.next();else if(Z==="back")this.back();else if(Z==="skip")this.skip()},this.handleKeydown=(J)=>{if(this.open&&J.key==="Escape")J.preventDefault(),this.skip()},this.handleViewport=()=>{this.light()}}get index(){return this.indexState??this.defaultIndex}set index(J){let Z=this.index;this.indexState=J,this.requestUpdate("index",Z)}get stops(){return(this.assigned??[]).filter((J)=>J.current!==void 0)}get length(){return this.stops.length}next(){if(this.index>=this.length-1){this.finish();return}this.move(this.index+1)}back(){if(this.index<=0)return;this.move(this.index-1)}skip(){let J=new RJ;if(this.dispatchEvent(J),J.defaultPrevented)return;this.open=!1}finish(){this.dispatchEvent(new bJ({value:String(this.index)})),this.open=!1}move(J){h({apply:(Z)=>{this.index=Z},event:(Z)=>new b1({value:String(Z)}),host:this,next:J})}connectedCallback(){super.connectedCallback(),this.addEventListener("helix-tour-ask",this.handleAsk),this.ownerDocument.addEventListener("keydown",this.handleKeydown),globalThis.addEventListener("resize",this.handleViewport,{passive:!0}),globalThis.addEventListener("scroll",this.handleViewport,{capture:!0,passive:!0})}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("helix-tour-ask",this.handleAsk),this.ownerDocument.removeEventListener("keydown",this.handleKeydown),globalThis.removeEventListener("resize",this.handleViewport),globalThis.removeEventListener("scroll",this.handleViewport,{capture:!0})}willUpdate(J){super.willUpdate(J),L(this.internals,{label:this.label,role:"region"})}updated(J){super.updated(J),this.settle(),this.light()}settle(){let J=this.stops,Z=Math.max(0,Math.min(this.index,J.length-1));J.forEach((K,Q)=>{if(K.current=this.open&&Q===Z,K.first=Q===0,K.last=Q===J.length-1,this.backLabel!=="")K.backLabel=this.backLabel;if(this.nextLabel!=="")K.nextLabel=this.nextLabel;if(this.doneLabel!=="")K.doneLabel=this.doneLabel;if(this.skipLabel!=="")K.skipLabel=this.skipLabel})}light(){let J=this.stops,Z=this.open?J[Math.max(0,Math.min(this.index,J.length-1))]?.target:void 0;if(!Z||typeof Z.getBoundingClientRect!=="function"){this.spot=void 0;return}let K=Z.getBoundingClientRect(),Q=this.spotlightPadding,Y={height:K.height+Q*2,left:K.left-Q,top:K.top-Q,width:K.width+Q*2};if(!(this.spot!==void 0&&this.spot.top===Y.top&&this.spot.left===Y.left&&this.spot.width===Y.width&&this.spot.height===Y.height))this.spot=Y}render(){let J=this.spot;return F`${J===void 0?"":F`<div
            part="spotlight"
            aria-hidden="true"
            style=${`inset-block-start: ${J.top}px; inset-inline-start: ${J.left}px; block-size: ${J.height}px; inline-size: ${J.width}px`}
          ></div>`}
      <slot></slot>`}};z1([q({reflect:!0,type:Boolean})],w0.prototype,"open",void 0);z1([q({type:Number})],w0.prototype,"index",null);z1([q({attribute:"default-index",type:Number})],w0.prototype,"defaultIndex",void 0);z1([q()],w0.prototype,"label",void 0);z1([q({attribute:"spotlight-padding",type:Number})],w0.prototype,"spotlightPadding",void 0);z1([q({attribute:"back-label"})],w0.prototype,"backLabel",void 0);z1([q({attribute:"next-label"})],w0.prototype,"nextLabel",void 0);z1([q({attribute:"done-label"})],w0.prototype,"doneLabel",void 0);z1([q({attribute:"skip-label"})],w0.prototype,"skipLabel",void 0);z1([i2({flatten:!0})],w0.prototype,"assigned",void 0);z1([U()],w0.prototype,"spot",void 0);w0=z1([G("helix-headless-tour")],w0);var i1=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},r0=class W extends A{constructor(){super(...arguments);this.for="",this.placement="bottom",this.current=!1,this.last=!1,this.first=!1,this.backLabel="Back",this.nextLabel="Next",this.doneLabel="Done",this.skipLabel="Skip",this.floating=new d(this,{anchor:()=>this.target,arrow:()=>this.renderRoot?.querySelector('[part="arrow"]'),onDismiss:()=>{},placement:()=>this.placement,surface:()=>this.renderRoot?.querySelector('[part="bubble"]')})}get target(){let J=this.getRootNode();return this.for===""?null:J.getElementById?.(this.for)??null}willUpdate(J){super.willUpdate(J),L(this.internals,{role:"group"})}updated(J){if(super.updated(J),this.current)this.floating.show();else this.floating.hide()}renderActions(){return T`<slot name="actions">
      <${this.tag("button")}
        part="skip"
      exportparts="button: skip-button" appearance="ghost" @click=${()=>this.ask("skip")}>
        ${this.skipLabel}
      </${this.tag("button")}>
      ${this.first?"":T`<${this.tag("button")}
              part="back"
      exportparts="button: back-button"
              appearance="outlined"
              @click=${()=>this.ask("back")}
            >
              ${this.backLabel}
            </${this.tag("button")}>`}
      <${this.tag("button")}
        part="next"
      exportparts="button: next-button"
        appearance="solid"
        tone="primary"
        @click=${()=>this.ask("next")}
      >
        ${this.last?this.doneLabel:this.nextLabel}
      </${this.tag("button")}>
    </slot>`}render(){return T`<div part="bubble" popover="manual" ?hidden=${!this.current}>
      ${""}
      <div part="arrow" aria-hidden="true"></div>
      <div part="content"><slot></slot></div>
      <div part="actions">
        ${this.renderActions()}
      </div>
    </div>`}ask(J){this.dispatchEvent(new G8({what:J}))}};i1([q()],r0.prototype,"for",void 0);i1([q()],r0.prototype,"placement",void 0);i1([q({reflect:!0,type:Boolean})],r0.prototype,"current",void 0);i1([q({reflect:!0,type:Boolean})],r0.prototype,"last",void 0);i1([q({reflect:!0,type:Boolean})],r0.prototype,"first",void 0);i1([q({attribute:"back-label"})],r0.prototype,"backLabel",void 0);i1([q({attribute:"next-label"})],r0.prototype,"nextLabel",void 0);i1([q({attribute:"done-label"})],r0.prototype,"doneLabel",void 0);i1([q({attribute:"skip-label"})],r0.prototype,"skipLabel",void 0);r0=i1([G("helix-headless-tour-stop")],r0);var Dq=N(`:host {
display: contents;
}

[part="spotlight"] {
border-radius: var(--tour-spotlight-radius, var(--helix-radii-md));
box-shadow: 0 0 0 100vmax var(--tour-scrim-color, var(--helix-color-overlay));
pointer-events: none;
position: fixed;
transition:
inset-block-start var(--helix-duration-normal) var(--helix-easing-standard),
inset-inline-start var(--helix-duration-normal) var(--helix-easing-standard),
block-size var(--helix-duration-normal) var(--helix-easing-standard),
inline-size var(--helix-duration-normal) var(--helix-easing-standard);
z-index: var(--helix-layer-overlay);
}

@media (prefers-reduced-motion: reduce) {
[part="spotlight"] {
transition: none;
}
}

@media print {
:host {
display: none;
}
}`);var PF=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},Pq=class W extends w0{static{this.styles=Dq}};Pq=PF([G("helix-tour")],Pq);var Iq=N(`:host {
display: contents;
}

[part="bubble"] {
background-color: var(--tour-surface-color, var(--helix-color-surface-raised));
border: var(--tour-border-width, var(--helix-border-thin)) solid var(--helix-color-border);
border-radius: var(--helix-radii-md);
box-shadow: var(--tour-shadow, var(--helix-shadow-floating));
box-sizing: border-box;
color: var(--helix-color-foreground);
display: flex;
flex-direction: column;
gap: var(--helix-space-md);
inline-size: max-content;
margin: var(--helix-space-none);
max-inline-size: var(--tour-bubble-size, 22rem);

overflow: visible;
padding: var(--tour-padding, var(--helix-space-md));
position: fixed;
}

:host [part="bubble"][hidden] {
display: none;
}

[part="content"] {
display: flex;
flex-direction: column;
gap: var(--helix-space-xs);
}

[part="actions"] {
align-items: center;
display: flex;
gap: var(--helix-space-xs);
justify-content: flex-end;
}

[part="skip"] {
margin-inline-end: auto;
}

[part="arrow"] {
background-color: var(--tour-surface-color, var(--helix-color-surface-raised));
block-size: var(--tour-arrow-size, 0.625rem);
inline-size: var(--tour-arrow-size, 0.625rem);
position: absolute;
rotate: 45deg;
}

[part="bubble"][data-placement^="bottom"] [part="arrow"] {
border-block-start: var(--helix-border-thin) solid var(--helix-color-border);
border-inline-start: var(--helix-border-thin) solid var(--helix-color-border);
inset-block-start: calc(var(--tour-arrow-size, 0.625rem) / -2);
}

[part="bubble"][data-placement^="top"] [part="arrow"] {
border-block-end: var(--helix-border-thin) solid var(--helix-color-border);
border-inline-end: var(--helix-border-thin) solid var(--helix-color-border);
inset-block-end: calc(var(--tour-arrow-size, 0.625rem) / -2);
}

[part="bubble"][data-placement^="right"] [part="arrow"] {
border-block-end: var(--helix-border-thin) solid var(--helix-color-border);
border-inline-start: var(--helix-border-thin) solid var(--helix-color-border);
inset-inline-start: calc(var(--tour-arrow-size, 0.625rem) / -2);
}

[part="bubble"][data-placement^="left"] [part="arrow"] {
border-block-start: var(--helix-border-thin) solid var(--helix-color-border);
border-inline-end: var(--helix-border-thin) solid var(--helix-color-border);
inset-inline-end: calc(var(--tour-arrow-size, 0.625rem) / -2);
}`);var IF=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},Tq=class W extends r0{static{this.tier="helix-"}static{this.styles=Iq}};Tq=IF([G("helix-tour-stop")],Tq);var UJ=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},K0=class W extends g(A){constructor(){super(...arguments);this.value="",this.href="",this.target="",this.rel="",this.selected=!1,this.focusable=!1,this.branch=!1,this.handleToggleClick=(J)=>{J.preventDefault(),J.stopPropagation(),this.toggleOpen()},this.handleRowClick=(J)=>{let Z=J.composedPath().some((K)=>K instanceof HTMLAnchorElement);if(this.branch&&this.href===""){if(!Z)this.toggleOpen();return}if(this.select(),!Z)this.follow()}}firstUpdated(J){super.firstUpdated(J);let Z=this.renderRoot.querySelector('slot[name="children"]');this.branch=(Z?.assignedElements().length??0)>0,Z?.addEventListener("slotchange",()=>{this.branch=Z.assignedElements().length>0})}get isBranch(){return this.branch}focusItem(){this.renderRoot.querySelector(this.href===""?'[part="item"]':'[part="row"]')?.focus({preventScroll:!0})}select(){this.dispatchEvent(new m({value:this.value}))}activate(){this.select(),this.follow()}follow(){let J=this.renderRoot?.querySelector('a[part="row"]');if(J){J.click();return}for(let Z of this.children){if(Z.slot!=="")continue;let K=Z instanceof HTMLAnchorElement?Z:Z.querySelector("a[href]");if(K){K.click();return}}}renderRow(){return F`${this.branch?F`<svg
            part="toggle"
            fill="currentColor"
            viewBox=${_0.viewBox}
            aria-hidden="true"
            @click=${this.href===""?z:this.handleToggleClick}
          >
          ${S(_0.content)}
        </svg>`:z}
      <slot name="start"></slot>
      <span part="label"><slot></slot></span>
      <slot name="end"></slot>`}willUpdate(J){super.willUpdate(J),this.toggleState("selected",this.selected)}render(){let J=this.href!=="",Z=this.level??1,K=this.branch?this.open?"true":"false":z,Q=this.focusable?"0":"-1";return F`<div
        part="item"
        role=${J?"none":"treeitem"}
        aria-expanded=${J?z:K}
        aria-selected=${J?z:this.selected?"true":"false"}
        aria-level=${J?z:Z}
        tabindex=${J?z:Q}
      >
        ${J?F`<a
                part="row"
                role="treeitem"
                href=${this.href}
                target=${this.target||z}
                rel=${this.rel||z}
                aria-expanded=${K}
                aria-selected=${this.selected?"true":"false"}
                aria-level=${Z}
                tabindex=${Q}
                style="--tree-level: ${Z}"
                @click=${this.handleRowClick}
              >${this.renderRow()}</a>`:F`<div
                part="row"
                style="--tree-level: ${Z}"
                @click=${this.handleRowClick}
              >${this.renderRow()}</div>`}
        <!-- Inside the treeitem, not beside it. It rendered as a sibling, so
             the row's \`aria-expanded\` described a group the row did not own and
             the branch reported children it had no relationship to. The pattern
             is \`treeitem\` containing \`group\`, which is also what an \`<li>\`
             holding a \`<ul>\` is. -->
        <div part="group" role="group" ?hidden=${!this.open}>
          <slot name="children"></slot>
        </div>
      </div>`}};UJ([q()],K0.prototype,"value",void 0);UJ([q()],K0.prototype,"href",void 0);UJ([q()],K0.prototype,"target",void 0);UJ([q()],K0.prototype,"rel",void 0);UJ([q({type:Boolean})],K0.prototype,"selected",void 0);UJ([q({attribute:"level",type:Number})],K0.prototype,"level",void 0);UJ([U()],K0.prototype,"focusable",void 0);UJ([U()],K0.prototype,"branch",void 0);K0=UJ([G("helix-headless-tree-item")],K0);var Uq=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},TF=new Set(["ArrowDown","ArrowUp","ArrowRight","ArrowLeft","Home","End","Enter"," "]),m9=class W extends z0(t1(A)){constructor(){super(...arguments);this.label="Tree",this.handleSelection=(J)=>{this.requestActive(J.detail.value),this.syncItems()},this.handleKeydown=(J)=>{let Z=h1(J.target,K0);if(!Z||!this.items.includes(Z)||!TF.has(J.key))return;if(J.key==="ArrowDown")this.move(Z,1);else if(J.key==="ArrowUp")this.move(Z,-1);else if(J.key==="Home")this.focusOn(this.visibleItems[0]);else if(J.key==="End")this.focusOn(this.visibleItems.at(-1));else if(J.key==="ArrowRight"){if(Z.isBranch&&!Z.open)Z.requestOpen(!0),this.syncItems();else if(Z.isBranch)this.move(Z,1)}else if(J.key==="ArrowLeft")if(Z.isBranch&&Z.open)Z.requestOpen(!1),this.syncItems();else{let K=h1(Z.parentElement,K0);this.focusOn(K instanceof K0?K:void 0)}else if(Z.isBranch)Z.toggleOpen(),this.syncItems();else Z.activate();J.preventDefault()},this.handleBranch=()=>{this.syncItems()}}get items(){return[...this.querySelectorAll("helix-tree-item, helix-headless-tree-item")].filter((J)=>J instanceof K0)}get visibleItems(){return this.items.filter((J)=>{let Z=J.parentElement;while(Z&&Z!==this){if(Z instanceof K0&&!Z.open)return!1;Z=Z.parentElement}return!0})}syncItems(){let J=this.visibleItems,Z=this.resolveActive(J),Q=J.find((Y)=>Y.focusable)??Z;for(let Y of this.items){Y.selected=Y.value!==""&&Y.value===this.active,Y.focusable=Y===Q;let X=1,$=Y.parentElement;while($&&$!==this){if($ instanceof K0)X+=1;$=$.parentElement}Y.level=X}}move(J,Z){let K=this.visibleItems,Q=K.indexOf(J),Y=K[Math.min(K.length-1,Math.max(0,Q+Z))];this.focusOn(Y)}focusOn(J){if(!J)return;for(let Z of this.items)Z.focusable=Z===J;J.focusItem(),R7(J,{padding:4})}connectedCallback(){super.connectedCallback(),this.addEventListener("helix-select",this.handleSelection),this.addEventListener("helix-before-open",this.handleBranch),this.addEventListener("helix-before-close",this.handleBranch),this.addEventListener("keydown",this.handleKeydown),this.watcher=new MutationObserver(()=>this.syncItems()),this.watcher.observe(this,{childList:!0,subtree:!0})}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("helix-select",this.handleSelection),this.removeEventListener("helix-before-open",this.handleBranch),this.removeEventListener("helix-before-close",this.handleBranch),this.removeEventListener("keydown",this.handleKeydown),this.watcher?.disconnect(),this.watcher=void 0}firstUpdated(J){super.firstUpdated(J),this.syncItems()}updated(J){if(super.updated(J),J.has("active"))this.syncItems()}render(){return F`<div
      part="tree"
      role="tree"
      aria-busy=${this.loading?"true":z}
      aria-label=${this.label}
    >
      <slot
        @slotchange=${(J)=>{this.countRows(J),this.syncItems()}}
      ></slot>
      ${this.renderStatus(this.hasRows)}
    </div>`}};Uq([q()],m9.prototype,"label",void 0);m9=Uq([G("helix-headless-tree")],m9);var Cq=N(`:host {

--_tree-chevron: var(--tree-chevron-size, var(--helix-size-icon-sm));
display: block;
}

[part="item"] {
border-radius: var(--helix-radii-sm);
margin-block-end: var(--tree-gap, var(--helix-space-2xs));
outline: none;
}

[part="row"] {

align-items: center;
border-radius: var(--helix-radii-sm);
color: var(--helix-color-foreground-muted);
cursor: pointer;
display: flex;
font-size: var(--_tree-text, var(--helix-text-sm));
gap: var(--helix-space-2xs);

block-size: max(
var(--tree-row-size, var(--helix-size-control-sm)),
calc(1lh + var(--helix-space-xs) * 2)
);
min-block-size: var(--tree-row-size, var(--helix-size-control-sm));
padding-block: var(--helix-space-xs);
padding-inline: var(--helix-space-xs);

padding-inline-start: calc(
var(--helix-space-xs) +
(var(--tree-level, 1) - 1) *
var(--tree-indent, calc(var(--_tree-chevron) + var(--helix-space-2xs)))
);
transition: background-color var(--helix-duration-fast) var(--helix-easing-standard);
user-select: none;
}

[part="row"]:not(:has([part="toggle"])) {
padding-inline-start: calc(
var(--helix-space-xs) +
(var(--tree-level, 1) - 1) *
var(--tree-indent, calc(var(--_tree-chevron) + var(--helix-space-2xs))) +
var(--_tree-reserve, calc(var(--_tree-chevron) + var(--helix-space-2xs)))
);
}

[part="row"]:has([part="toggle"]) {
font-weight: var(--helix-weight-medium);
}

[part="row"]:not(:has([part="toggle"])) {
font-weight: var(--helix-weight-medium);
}

slot[name="children"]::slotted(*) {
--_tree-text: var(--helix-text-xs);
}

[part="row"]:hover {
background-color: var(--helix-color-surface-raised);
color: var(--helix-color-foreground);
}

:host(:state(selected)) [part="row"] {
background-color: var(--helix-color-surface-sunken);
color: var(--helix-color-foreground);
}

[part="item"]:focus-visible [part="row"],
[part="row"]:focus-visible {
outline: var(--helix-size-focus-ring) solid var(--helix-color-focus-ring);
outline-offset: calc(var(--helix-size-focus-offset) * -1);
}

a[part="row"] {
text-decoration: none;
}

[part="toggle"] {
block-size: var(--_tree-chevron);
color: var(--helix-color-foreground-subtle);
flex: 0 0 auto;
inline-size: var(--_tree-chevron);
transform: rotate(-90deg);
transition: transform var(--helix-duration-fast) var(--helix-easing-standard);
}

:host(:state(open)) [part="toggle"] {
transform: rotate(0deg);
}

[part="label"] {

align-self: stretch;
flex: 1;

min-inline-size: 0;
overflow: hidden;
text-overflow: ellipsis;
white-space: nowrap;
}

[part="label"] slot::slotted(a) {
display: block;
overflow: hidden;
text-overflow: ellipsis;
}

slot[name="start"]::slotted(*),
slot[name="end"]::slotted(*) {
flex: 0 0 auto;
}

slot[name="end"] {
align-items: center;
display: flex;
gap: var(--helix-space-2xs);

margin-inline-start: auto;
order: 1;
}

slot[name="start"]::slotted(*) {
color: var(--helix-color-foreground-subtle);
}

[part="group"] {
display: grid;
grid-template-rows: 1fr;
transition:
grid-template-rows var(--helix-duration-fast) var(--helix-easing-standard),
display var(--helix-duration-fast) allow-discrete;
}

[part="group"] > slot {
display: block;
min-block-size: 0;
overflow: hidden;
}

[part="group"][hidden] {
display: none;
grid-template-rows: 0fr;
}

@starting-style {
[part="group"]:not([hidden]) {
grid-template-rows: 0fr;
}
}

@media (prefers-reduced-motion: reduce) {
[part="group"] {
transition: none;
}
}

@media (prefers-reduced-motion: reduce) {
[part="row"] {
transition: none;
}

[part="toggle"] {
transition: none;
}
}

[part="toggle"] {

align-self: center;
margin-inline-start: var(--tree-chevron-gap, var(--helix-space-none));
order: var(--tree-chevron-order, 0);
}`);var UF=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},Lq=class W extends K0{static{this.styles=Cq}};Lq=UF([G("helix-tree-item")],Lq);var Mq=N(`:host {
display: block;
}

[part="tree"] {
display: flex;
flex-direction: column;
}

:host {
--tree-chevron-order: 0;
}

:host([chevron-placement="end"]) {

--tree-chevron-order: 2;
--tree-chevron-gap: var(--helix-space-none);

--_tree-reserve: var(--helix-space-none);
}

[part="empty"],
[part="loading"] {
color: var(--helix-color-foreground-subtle);
font-family: var(--helix-font-sans);
font-size: var(--helix-text-sm);
margin: var(--helix-space-none);
padding-block: var(--helix-space-md);
padding-inline: var(--helix-space-sm);
text-align: center;
}

:host([loading]) [part="tree"] {
opacity: 0.5;
}

@media print {
:host {
box-shadow: none;
}
}`);var Sq=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},HY=class W extends m9{static{this.styles=Mq}};Sq([q({attribute:"chevron-placement",reflect:!0})],HY.prototype,"chevronPlacement",void 0);HY=Sq([G("helix-tree")],HY);var uY=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},Rq={down:{icon:F6,word:"Down"},neutral:{icon:E7,word:"Unchanged"},up:{icon:N6,word:"Up"}},CF=(W)=>Rq[W]??Rq.neutral,D5=class W extends A{render(){let J=CF(this.direction),Z=this.good&&this.direction&&this.direction!=="neutral"?this.good===this.direction?", better":", worse":"";return F`<svg
        aria-hidden="true"
        data-glyph
        fill="currentColor"
        part="icon"
        viewBox=${J.icon.viewBox}
      >
        ${S(J.icon.content)}
      </svg>
      <span part="direction">${`${J.word}${Z}`}</span>
      <slot></slot>
      <slot name="label"></slot>`}};uY([q({reflect:!0})],D5.prototype,"direction",void 0);uY([q({reflect:!0})],D5.prototype,"good",void 0);D5=uY([G("helix-headless-trend")],D5);var Eq=N(`:host {
align-items: center;
display: inline-flex;
font-size: var(--helix-text-sm);
font-weight: var(--helix-weight-medium);
gap: var(--helix-space-2xs);
line-height: var(--helix-leading-tight);
}

:host {
color: var(--trend-color, var(--_trend-color));

--_trend-color: var(--helix-color-foreground-muted);
}

[part="icon"] {
--icon-size: var(--trend-icon-size, 1em);
}

:host([direction="up"][good="up"]),
:host([direction="down"][good="down"]) {
--_trend-color: var(--helix-color-success);
}

:host([direction="up"][good="down"]),
:host([direction="down"][good="up"]) {
--_trend-color: var(--helix-color-danger);
}

[part="direction"] {
block-size: 1px;
clip-path: inset(50%);
inline-size: 1px;
overflow: hidden;
position: absolute;
white-space: nowrap;
}

slot[name="label"] {
color: var(--helix-color-foreground-muted);
font-weight: var(--helix-weight-regular);
}

@media print {
:host {
box-shadow: none;
}
}`);var LF=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},wq=class W extends D5{static{this.styles=[A0,Eq]}};wq=LF([G("helix-trend")],wq);var v=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},f4=(W)=>{if(!Number.isFinite(W)||W<0)return"0:00";let J=Math.floor(W),Z=Math.floor(J/3600),K=Math.floor(J%3600/60),Q=J%60,Y=`${String(Q).padStart(2,"0")}`;return Z>0?`${Z}:${String(K).padStart(2,"0")}:${Y}`:`${K}:${Y}`},j4,V1=10,j=class W extends A{constructor(){super(...arguments);this.src="",this.poster="",this.label="",this.loop=!1,this.defaultMuted=!1,this.playsInline=!0,this.controls=!1,this.preload="metadata",this.autoplay=!1,this.crossOrigin=null,this.disablePictureInPicture=!1,this.disableRemotePlayback=!1,this.extraControls="",this.overflowControls="",this.speeds="0.5 1 1.5 2",this.idleDelay=2500,this.playLabel="Play",this.pauseLabel="Pause",this.loadingLabel="Loading",this.errorLabel="This video could not be played",this.buffering=!1,this.failed=!1,this.playing=!1,this.position=0,this.knownDuration=0,this.loudness=1,this.silent=!1,this.full=!1,this.captioned=!1,this.captionIndex=-1,this.captionCount=0,this.rate=1,this.idle=!1,this.remoteAvailable=!1,this.remoteConnected=!1,this.media=[],this.handleMedia=(J)=>{let Z=J.target.assignedElements();this.media=Z.filter((K)=>K instanceof HTMLSourceElement||K instanceof HTMLTrackElement).map((K)=>{let Q=K instanceof HTMLTrackElement?"track":"source",Y=Q==="track"?["default","kind","label","src","srclang"]:["media","sizes","src","srcset","type"],X={};for(let $ of Y){let V=K.getAttribute($);if(V!==null)X[$]=V}return{attrs:X,tag:Q}})},this.handleLoaded=()=>{let J=this.video;if(!J)return;if(this.knownDuration=J.duration,J.videoWidth>0&&J.videoHeight>0)this.style.setProperty("--video-intrinsic-ratio",`${J.videoWidth} / ${J.videoHeight}`);this.captionCount=this.captionTracks.length;let Z=J.textTracks[0];if(Z){if(Z.mode==="showing")Z.mode="hidden";this.captioned=Z.mode==="hidden",this.cued?.removeEventListener("cuechange",this.handleCue),this.cued=Z,Z.addEventListener("cuechange",this.handleCue),this.handleCue()}},this.handleTime=()=>{this.position=this.video?.currentTime??0},this.handleWaiting=()=>{this.buffering=!0},this.handleReady=(J)=>{if(this.buffering=!1,J.type==="loadstart")this.failed=!1},this.handleError=()=>{this.buffering=!1,this.failed=!0},this.handleState=(J)=>{let Z=this.video;if(this.playing=Z?!Z.paused:!1,J.type==="emptied"||J.type==="pause")this.buffering=!1;if(J.type==="play")this.claimSession();if(j4===this&&typeof navigator!=="undefined"&&navigator.mediaSession)navigator.mediaSession.playbackState=this.playing?"playing":"paused";this.dispatchEvent(new Event(J.type,{bubbles:!1,composed:!1}))},this.handleVolume=()=>{let J=this.video;if(!J)return;this.loudness=J.volume,this.silent=J.muted},this.handleCue=()=>{let Z=(this.captionTracks[this.captionIndex]??this.video?.textTracks[0])?.activeCues?.[0];this.cue=Z instanceof VTTCue?Z.getCueAsHTML():void 0},this.stir=()=>{if(this.idle=!1,clearTimeout(this.idleTimer),this.idleDelay>0)this.idleTimer=setTimeout(()=>{this.idle=!0},this.idleDelay)},this.handleFullscreenChange=()=>{this.full=document.fullscreenElement===this},this.handleKeydown=(J)=>{if(this.controls)return;if(J.target?.tagName==="INPUT")return;let Z=this.video;if(!Z)return;let K=J.shiftKey?10:5;switch(J.key){case" ":case"k":{this.toggle();break}case"ArrowRight":{this.seek(Z.currentTime+K);break}case"ArrowLeft":{this.seek(Z.currentTime-K);break}case"ArrowUp":{Z.volume=Math.min(Z.volume+0.1,1);break}case"ArrowDown":{Z.volume=Math.max(Z.volume-0.1,0);break}case"j":{this.skipBy(-V1);break}case"l":{this.skipBy(V1);break}case"m":{Z.muted=!Z.muted;break}case"f":{this.toggleFullscreen();break}default:return}J.preventDefault()},this.handleRemoteState=()=>{this.remoteConnected=this.video?.remote?.state==="connected"}}get localFile(){if(this.src==="")return!1;if(this.src.startsWith("blob:")||this.src.startsWith("data:"))return!0;if(typeof location==="undefined")return!1;try{return new URL(this.src,location.href).origin===location.origin}catch{return!1}}offers(J){if(J==="pip")return typeof document!=="undefined"&&document.pictureInPictureEnabled;if(J==="remote")return this.remoteAvailable;if(J==="download")return this.src!=="";if(J==="next"||J==="previous")return!0;if(J==="forward"||J==="rewind")return!0;return J==="speed"}get extras(){return this.extraControls.split(/\s+/).filter(Boolean).filter((J)=>this.offers(J))}get overflow(){let J=new Set(this.extras);return this.overflowControls.split(/\s+/).filter(Boolean).filter((Z)=>!J.has(Z)&&this.offers(Z))}get currentSrc(){return this.video?.currentSrc??""}get currentTime(){return this.video?.currentTime??this.position}set currentTime(J){this.position=J,this.seek(J)}get defaultPlaybackRate(){return this.video?.defaultPlaybackRate??1}set defaultPlaybackRate(J){let Z=this.video;if(Z)Z.defaultPlaybackRate=J}get duration(){return this.video?.duration??this.knownDuration}get ended(){return this.video?.ended??!1}get paused(){return this.video?.paused??!this.playing}get playbackRate(){return this.video?.playbackRate??this.rate}set playbackRate(J){this.rate=J;let Z=this.video;if(Z)Z.playbackRate=J}get preservesPitch(){return this.video?.preservesPitch??!0}set preservesPitch(J){let Z=this.video;if(Z)Z.preservesPitch=J}get seeking(){return this.video?.seeking??!1}get videoHeight(){return this.video?.videoHeight??0}get videoWidth(){return this.video?.videoWidth??0}get muted(){return this.video?.muted??this.defaultMuted}set muted(J){this.silent=J;let Z=this.video;if(Z)Z.muted=J}get volume(){return this.video?.volume??this.loudness}set volume(J){this.loudness=J;let Z=this.video;if(Z)Z.volume=J}get video(){return this.renderRoot?.querySelector('[part="video"]')??null}play(){this.video?.play().catch(()=>{})}pause(){this.video?.pause()}toggle(){let J=this.video;if(!J)return;if(J.paused)this.play();else this.pause()}seek(J){let Z=this.video;if(!Z||!Number.isFinite(Z.duration))return;Z.currentTime=Math.min(Math.max(J,0),Z.duration)}takeScrub(J){J.stopPropagation(),this.seek(Number(J.target.value))}takeVolume(J){J.stopPropagation();let Z=this.video;if(!Z)return;Z.volume=Number(J.target.value),Z.muted=!1}claimSession(){if(typeof navigator==="undefined"||!navigator.mediaSession)return;j4=this;let J=navigator.mediaSession;J.metadata=new MediaMetadata({artwork:this.poster===""?[]:[{src:this.poster}],title:this.label}),J.setActionHandler("play",()=>this.toggle()),J.setActionHandler("pause",()=>this.toggle()),J.setActionHandler("seekbackward",(K)=>{this.seek((this.video?.currentTime??0)-(K.seekOffset??10))}),J.setActionHandler("seekforward",(K)=>{this.seek((this.video?.currentTime??0)+(K.seekOffset??10))}),J.setActionHandler("seekto",(K)=>{if(K.seekTime!==void 0&&K.seekTime!==null)this.seek(K.seekTime)});let Z=`${this.extraControls} ${this.overflowControls}`.split(/\s+/);J.setActionHandler("seekbackward",(K)=>{this.skipBy(-(K.seekOffset??V1))}),J.setActionHandler("seekforward",(K)=>{this.skipBy(K.seekOffset??V1)}),J.setActionHandler("nexttrack",Z.includes("next")?()=>this.skip(!1):null),J.setActionHandler("previoustrack",Z.includes("previous")?()=>this.skip(!0):null)}skipBy(J){let Z=this.video;if(!Z)return;this.seek(Z.currentTime+J)}get captionTracks(){let J=this.video?.textTracks;if(!J)return[];return[...J].filter((Z)=>Z.kind==="subtitles"||Z.kind==="captions")}showCaption(J){this.captionTracks.forEach((K,Q)=>{K.mode=Q===J?"hidden":"disabled"}),this.captionIndex=J,this.captioned=J>=0,this.cue=void 0}toggleCaptions(){if(this.captionTracks.length===0)return;this.showCaption(this.captioned?-1:0)}skip(J){this.dispatchEvent(J?new q8:new $8)}cycleSpeed(){let J=this.speeds.split(/\s+/).map(Number).filter((Y)=>Y>0),Z=this.video;if(!Z||J.length===0)return;let K=J.indexOf(Z.playbackRate),Q=J[(K+1)%J.length]??1;Z.playbackRate=Q,this.rate=Q}async watchRemote(){let J=this.video?.remote;if(!J?.watchAvailability)return;try{this.remoteWatch=await J.watchAvailability((Z)=>{this.remoteAvailable=Z})}catch{}}async promptRemote(){try{await this.video?.remote?.prompt()}catch{}}async togglePip(){let J=this.video;if(!J)return;if(document.pictureInPictureElement===J){await document.exitPictureInPicture();return}await J.requestPictureInPicture()}async toggleFullscreen(){try{if(document.fullscreenElement===this){await document.exitFullscreen();return}await this.requestFullscreen()}catch(J){console.warn(`<${this.localName}> could not enter fullscreen. If it is inside an iframe, that frame needs allow="fullscreen".`,J)}}connectedCallback(){super.connectedCallback(),document.addEventListener("fullscreenchange",this.handleFullscreenChange)}disconnectedCallback(){if(super.disconnectedCallback(),clearTimeout(this.idleTimer),this.cued?.removeEventListener("cuechange",this.handleCue),this.cued=void 0,document.removeEventListener("fullscreenchange",this.handleFullscreenChange),this.remoteWatch!==void 0)this.video?.remote?.cancelWatchAvailability?.(this.remoteWatch),this.remoteWatch=void 0;if(j4===this){if(j4=void 0,typeof navigator!=="undefined"&&navigator.mediaSession)navigator.mediaSession.metadata=null,navigator.mediaSession.playbackState="none"}}firstUpdated(J){super.firstUpdated?.(J);let Z=this.video;if(Z)this.silent=Z.muted,this.loudness=Z.volume,Z.remote?.addEventListener?.("connect",this.handleRemoteState),Z.remote?.addEventListener?.("disconnect",this.handleRemoteState),this.watchRemote()}updated(J){if(super.updated?.(J),this.toggleAttribute("data-playing",this.playing),this.toggleAttribute("data-idle",this.idle&&this.playing),J.has("media"))this.video?.load(),this.captionCount=this.captionTracks.length}renderExtra(J){if(J==="remote")return T`<button
        part="remote"
        type="button"
        aria-label="Play on another device"
        aria-pressed=${this.remoteConnected?"true":"false"}
        @click=${()=>void this.promptRemote()}
      >
        ${x(y5)}
      </button>`;if(J==="rewind")return T`<button
        part="rewind"
        type="button"
        aria-label=${`Back ${V1} seconds`}
        @click=${()=>this.skipBy(-V1)}
      >
        ${x(p5)}
      </button>`;if(J==="forward")return T`<button
        part="forward"
        type="button"
        aria-label=${`Forward ${V1} seconds`}
        @click=${()=>this.skipBy(V1)}
      >
        ${x(m5)}
      </button>`;if(J==="speed")return T`<button
        part="speed"
        type="button"
        aria-label="Playback speed"
        @click=${()=>this.cycleSpeed()}
      >
        ${this.rate}x
      </button>`;if(J==="previous")return T`<button
        part="previous"
        type="button"
        aria-label="Previous"
        @click=${()=>this.skip(!0)}
      >
        ${x(a5)}
      </button>`;if(J==="next")return T`<button
        part="next"
        type="button"
        aria-label="Next"
        @click=${()=>this.skip(!1)}
      >
        ${x(o5)}
      </button>`;if(J==="download"){let Z=this.localFile;return T`<a
        part="download"
        ?download=${Z}
        href=${this.src}
        target=${Z?z:"_blank"}
        rel=${Z?z:"noreferrer"}
        aria-label="Download"
      >
        ${x(d5)}
      </a>`}return T`<button
      part="pip"
      type="button"
      aria-label="Picture in picture"
      @click=${()=>void this.togglePip()}
    >
      ${x(s5)}
    </button>`}renderCaptions(){let J=this.captionTracks;if(this.captionCount===0)return z;if(this.captionCount===1)return T`<button
        part="captions"
        type="button"
        aria-label="Captions"
        aria-pressed=${this.captioned?"true":"false"}
        @click=${()=>this.toggleCaptions()}
      >
        ${x(c5)}
      </button>`;return T`<${this.tag("menu")} part="captions-menu"
    exportparts="back: captions-menu-back, back-mark: captions-menu-back-mark, empty: captions-menu-empty,
      header: captions-menu-header, loading: captions-menu-loading, surface: captions-menu-surface,
      title: captions-menu-title" label="Subtitles" placement="top-end">
      <button part="captions" slot="trigger" type="button" aria-label="Subtitles">
        ${x(c5)}
      </button>
      <${this.tag("menu-item")}
        part="entry"
      exportparts="item: entry-item, mark: entry-mark, start: entry-start"
        value="off"
        aria-checked=${this.captionIndex<0?"true":"false"}
        role="menuitemradio"
        @helix-select=${()=>this.showCaption(-1)}
      >
        Off
      </${this.tag("menu-item")}>
      ${J.map((Z,K)=>T`<${this.tag("menu-item")} part="entry"
        exportparts="item: entry-item, mark: entry-mark, start: entry-start"
          value=${Z.language||String(K)}
          aria-checked=${this.captionIndex===K?"true":"false"}
          role="menuitemradio"
          @helix-select=${()=>this.showCaption(K)}
        >
          ${Z.label||Z.language}
        </${this.tag("menu-item")}>`)}
    </${this.tag("menu")}>`}renderOverflowItem(J){if(J==="remote")return T`<${this.tag("menu-item")} part="entry"
      exportparts="item: entry-item, mark: entry-mark, start: entry-start"
        value="remote"
        @helix-select=${()=>void this.promptRemote()}
      >
        ${x(y5,{slot:"start"})}
        Play on another device
      </${this.tag("menu-item")}>`;if(J==="speed")return T`<${this.tag("menu-item")} part="entry"
      exportparts="item: entry-item, mark: entry-mark, start: entry-start" value="speed" @helix-select=${()=>this.cycleSpeed()}>
        ${x(M6,{slot:"start"})}
        Playback speed: ${this.rate}x
      </${this.tag("menu-item")}>`;if(J==="rewind"||J==="forward"){let Z=J==="rewind";return T`<${this.tag("menu-item")} part="entry"
      exportparts="item: entry-item, mark: entry-mark, start: entry-start"
        value=${J}
        @helix-select=${()=>this.skipBy(Z?-V1:V1)}
      >
        ${x(Z?p5:m5,{slot:"start"})}
        ${Z?`Back ${V1} seconds`:`Forward ${V1} seconds`}
      </${this.tag("menu-item")}>`}if(J==="previous")return T`<${this.tag("menu-item")} part="entry"
      exportparts="item: entry-item, mark: entry-mark, start: entry-start" value="previous" @helix-select=${()=>this.skip(!0)}>
        ${x(a5,{slot:"start"})}
        Previous
      </${this.tag("menu-item")}>`;if(J==="next")return T`<${this.tag("menu-item")} part="entry"
      exportparts="item: entry-item, mark: entry-mark, start: entry-start" value="next" @helix-select=${()=>this.skip(!1)}>
        ${x(o5,{slot:"start"})}
        Next
      </${this.tag("menu-item")}>`;if(J==="download"){let Z=this.localFile;return T`<${this.tag("menu-item")} part="entry"
      exportparts="item: entry-item, mark: entry-mark, start: entry-start"
        ?download=${Z}
        href=${this.src}
        rel=${Z?z:"noreferrer"}
        target=${Z?z:"_blank"}
        value="download"
      >
        ${x(d5,{slot:"start"})}
        Download
      </${this.tag("menu-item")}>`}return T`<${this.tag("menu-item")} part="entry"
    exportparts="item: entry-item, mark: entry-mark, start: entry-start" value="pip" @helix-select=${()=>void this.togglePip()}>
      ${x(s5,{slot:"start"})}
      Picture in picture
    </${this.tag("menu-item")}>`}renderBar(){let J=this.knownDuration>0?this.position/this.knownDuration:0;return T`<div part="controls">
      <button
        part="play"
        type="button"
        aria-label=${this.playing?this.pauseLabel:this.playLabel}
        @click=${()=>this.toggle()}
      >
        ${x(this.playing?E6:mJ)}
      </button>
      <span part="time">${f4(this.position)} / ${f4(this.knownDuration)}</span>
      <input
        part="scrubber"
        type="range"
        min="0"
        max=${Number.isFinite(this.knownDuration)&&this.knownDuration>0?this.knownDuration:0}
        step="0.01"
        .value=${String(this.position)}
        aria-label="Seek"
        aria-valuetext=${`${f4(this.position)} of ${f4(this.knownDuration)}`}
        style=${`--video-progress: ${J}`}
        @input=${this.takeScrub}
      />
      <span part="sound">
      <button
        part="mute"
        type="button"
        aria-label=${this.silent?"Unmute":"Mute"}
        aria-pressed=${this.silent?"true":"false"}
        @click=${()=>{let Z=this.video;if(Z)Z.muted=!Z.muted}}
      >
        ${x(this.silent||this.loudness===0?b6:w6)}
      </button>
      <input
        part="volume"
        type="range"
        min="0"
        max="1"
        step="0.05"
        .value=${String(this.silent?0:this.loudness)}
        aria-label="Volume"
        aria-valuetext=${`${Math.round((this.silent?0:this.loudness)*100)} percent`}
        style=${`--video-level: ${this.silent?0:this.loudness}`}
        @input=${this.takeVolume}
      />
      </span>
      ${this.renderCaptions()}
      ${this.extras.map((Z)=>this.renderExtra(Z))}
      ${this.overflow.length===0?z:T`<${this.tag("menu")} part="overflow"
          exportparts="back: overflow-back, back-mark: overflow-back-mark, empty: overflow-empty,
            header: overflow-header, loading: overflow-loading, surface: overflow-surface,
            title: overflow-title" label="More controls" placement="top-end">
              <button part="more" slot="trigger" type="button" aria-label="More controls">
                ${x(T6)}
              </button>
              ${this.overflow.map((Z)=>this.renderOverflowItem(Z))}
            </${this.tag("menu")}>`}
      ${""}
      <slot name="controls"></slot>
      <button
        part="fullscreen"
        type="button"
        aria-label=${this.full?"Exit fullscreen":"Fullscreen"}
        aria-pressed=${this.full?"true":"false"}
        @click=${()=>void this.toggleFullscreen()}
      >
        ${x(this.full?P6:I6)}
      </button>
    </div>`}render(){return T`<div
        part="stage"
        tabindex=${this.controls?z:"0"}
        role=${this.controls?z:"group"}
        aria-label=${this.controls?z:this.label||"Video"}
        @keydown=${this.handleKeydown}
        @pointermove=${this.stir}
        @pointerleave=${()=>{clearTimeout(this.idleTimer),this.idle=!0}}
        @focusin=${this.stir}
      >
      <video
        part="video"
        aria-label=${this.label||z}
        src=${this.src||z}
        poster=${this.poster||z}
        preload=${this.preload}
        crossorigin=${this.crossOrigin??z}
        ?autoplay=${this.autoplay}
        ?controls=${this.controls}
        ?disablepictureinpicture=${this.disablePictureInPicture}
        ?disableremoteplayback=${this.disableRemotePlayback}
        ?loop=${this.loop}
        ?muted=${this.defaultMuted}
        ?playsinline=${this.playsInline}
        @loadedmetadata=${this.handleLoaded}
        @timeupdate=${this.handleTime}
        @volumechange=${this.handleVolume}
        @play=${this.handleState}
        @pause=${this.handleState}
        @ended=${this.handleState}
        @emptied=${this.handleState}
        @waiting=${this.handleWaiting}
        @playing=${this.handleReady}
        @canplay=${this.handleReady}
        @loadstart=${this.handleReady}
        @error=${this.handleError}
      >
        ${this.media.map((J)=>J.tag==="track"?T`<track
                ?default=${"default"in J.attrs}
                kind=${J.attrs.kind??z}
                label=${J.attrs.label??z}
                src=${J.attrs.src??z}
                srclang=${J.attrs.srclang??z}
              />`:T`<source
                media=${J.attrs.media??z}
                sizes=${J.attrs.sizes??z}
                src=${J.attrs.src??z}
                srcset=${J.attrs.srcset??z}
                type=${J.attrs.type??z}
              />`)}
      </video>
      <!-- Outside the video, and hidden. It exists to notice what the consumer
           wrote, not to be rendered: a slot inside a media element is the one
           child its resource selection sees, and a slot is not a source.
           No backticks in here: this comment is inside a template literal, and
           the first one ends it. -->
      <span aria-hidden="true" hidden><slot @slotchange=${this.handleMedia}></slot></span>
      ${this.cue===void 0?z:T`<p aria-live="off" part="cue">${this.cue}</p>`}
      ${""}
      <div part="back"><slot name="back"></slot></div>
      <slot name="poster" part="poster"></slot>
      ${this.buffering&&!this.failed?T`<div
              part="loading"
              role="status"
              aria-live="polite"
            >
              <span part="loading-mark" aria-hidden="true"></span>
              ${this.loadingLabel}
            </div>`:z}
      ${this.failed?T`<div
              part="failure"
              role="alert"
            >
              ${this.errorLabel}
            </div>`:z}
      ${this.controls||this.playing||this.buffering||this.failed||this.startControl==="none"?z:T`<button
              part="start"
              type="button"
              aria-label=${this.playLabel}
              @click=${()=>this.toggle()}
            >
              ${x(mJ)}
            </button>`}
      ${this.controls?z:this.renderBar()}
    </div>`}};v([q()],j.prototype,"src",void 0);v([q()],j.prototype,"poster",void 0);v([q()],j.prototype,"label",void 0);v([q({reflect:!0,type:Boolean})],j.prototype,"loop",void 0);v([q({attribute:"muted",reflect:!0,type:Boolean})],j.prototype,"defaultMuted",void 0);v([q({attribute:"plays-inline",converter:M7})],j.prototype,"playsInline",void 0);v([q({reflect:!0,type:Boolean})],j.prototype,"controls",void 0);v([q()],j.prototype,"preload",void 0);v([q({reflect:!0,type:Boolean})],j.prototype,"autoplay",void 0);v([q({attribute:"crossorigin"})],j.prototype,"crossOrigin",void 0);v([q({attribute:"disable-picture-in-picture",reflect:!0,type:Boolean})],j.prototype,"disablePictureInPicture",void 0);v([q({attribute:"disable-remote-playback",reflect:!0,type:Boolean})],j.prototype,"disableRemotePlayback",void 0);v([q({attribute:"extra-controls"})],j.prototype,"extraControls",void 0);v([q({attribute:"overflow-controls"})],j.prototype,"overflowControls",void 0);v([q({attribute:"start-control"})],j.prototype,"startControl",void 0);v([q({attribute:"speeds"})],j.prototype,"speeds",void 0);v([q({attribute:"idle-delay",type:Number})],j.prototype,"idleDelay",void 0);v([q({attribute:"play-label"})],j.prototype,"playLabel",void 0);v([q({attribute:"pause-label"})],j.prototype,"pauseLabel",void 0);v([q({attribute:"loading-label"})],j.prototype,"loadingLabel",void 0);v([q({attribute:"error-label"})],j.prototype,"errorLabel",void 0);v([U()],j.prototype,"buffering",void 0);v([U()],j.prototype,"failed",void 0);v([U()],j.prototype,"playing",void 0);v([U()],j.prototype,"position",void 0);v([U()],j.prototype,"knownDuration",void 0);v([U()],j.prototype,"loudness",void 0);v([U()],j.prototype,"silent",void 0);v([U()],j.prototype,"full",void 0);v([U()],j.prototype,"captioned",void 0);v([U()],j.prototype,"captionIndex",void 0);v([U()],j.prototype,"captionCount",void 0);v([U()],j.prototype,"cue",void 0);v([U()],j.prototype,"rate",void 0);v([U()],j.prototype,"idle",void 0);v([U()],j.prototype,"remoteAvailable",void 0);v([U()],j.prototype,"remoteConnected",void 0);v([U()],j.prototype,"media",void 0);j=v([G("helix-headless-video")],j);var bq=N(`:host {
color-scheme: dark;

display: block;
position: relative;
}

[part="stage"] {
border-radius: var(--video-radius, var(--helix-radii-md));
display: block;
overflow: hidden;
position: relative;
}

[part="stage"]:focus-visible {
outline: var(--helix-size-focus-ring) solid var(--helix-color-focus-ring);
outline-offset: calc(var(--helix-size-focus-offset) * -1);
}

[part="video"] {

aspect-ratio: var(--video-aspect-ratio, var(--video-intrinsic-ratio, 16 / 9));

background-color: var(--video-well-color, var(--helix-color-surface-media));
block-size: auto;
display: block;
inline-size: 100%;
object-fit: contain;
}

[part="controls"] {
align-items: center;

color: var(--video-controls-color, var(--helix-color-foreground));
display: flex;
gap: var(--helix-space-xs);
inset-block-end: 0;
inset-inline: 0;
opacity: 1;
padding: var(--helix-space-xs) var(--helix-space-sm);
position: absolute;
transition: opacity var(--helix-duration-fast) var(--helix-easing-standard);
}

:host([separation="filled"]) [part="controls"] {
background-color: var(--helix-color-surface);
color: var(--helix-color-foreground);
}

[part="stage"]::before {
background-image: linear-gradient(to top, var(--helix-color-overlay), transparent);
block-size: calc(var(--helix-size-icon-lg) + var(--helix-space-2xl));
content: "";
inset-block-end: 0;
inset-inline: 0;
opacity: 1;
pointer-events: none;
position: absolute;
transition: opacity var(--helix-duration-fast) var(--helix-easing-standard);
}

:host([separation="filled"]) [part="stage"]::before {
content: none;
}

:host([separation="filled"][data-idle]:not(:focus-within)) [part="controls"] {
opacity: 1;
}

:host([data-idle]:not(:focus-within)) [part="stage"]::before {
opacity: 0;
}

:host([separation="plain"]) [part="stage"]::before,
:host([controls]) [part="stage"]::before {
content: none;
}

:host([data-idle]:not(:focus-within)) [part="controls"] {
opacity: 0;
}

[part="controls"] :where(a, button) {
all: unset;
--icon-size: var(--helix-size-icon-sm);

align-items: center;
border-radius: var(--helix-radii-sm);
box-sizing: border-box;
color: inherit;
cursor: pointer;
display: flex;
flex: 0 0 auto;
justify-content: center;
min-block-size: var(--helix-size-icon-lg);
min-inline-size: var(--helix-size-icon-lg);
}

[part="controls"] :where(a, button):focus-visible,
[part="scrubber"]:focus-visible,
[part="volume"]:focus-visible {
outline: var(--helix-size-focus-ring) solid var(--helix-color-focus-ring);
outline-offset: var(--helix-size-focus-offset);
}

[part="time"] {
color: inherit;
flex: 0 0 auto;
font-family: var(--helix-font-sans);
font-size: var(--helix-text-xs);
font-variant-numeric: tabular-nums;
}

[part="scrubber"],
[part="volume"] {
appearance: none;
border-radius: var(--helix-radii-full);
cursor: pointer;
margin: var(--helix-space-none);
}

[part="scrubber"] {
background-color: color-mix(in oklab, currentColor 28%, transparent);
background-image: linear-gradient(
to right,
var(--_video-fill) calc(var(--_video-at, 0) * 100%),
transparent calc(var(--_video-at, 0) * 100%)
);
block-size: 4px;
}

[part="scrubber"] {
--_video-at: var(--video-progress, 0);
--_video-fill: var(--video-accent-color, var(--helix-color-primary));

flex: 1 1 auto;
min-inline-size: 0;
}

[part="volume"] {
--_video-at: var(--video-level, 1);
--_video-fill: currentColor;
}

[part="sound"] {
--_video-level-size: 4.5rem;

--_video-level-gap: var(--helix-space-2xs);
--_video-level-lift: calc(100% + var(--_video-level-gap));

align-items: center;
display: flex;
flex: 0 0 auto;
position: relative;
}

[part="volume"] {

writing-mode: vertical-rl;

background-color: color-mix(in oklab, currentColor 28%, transparent);
background-image: linear-gradient(
to top,
var(--_video-fill) calc(var(--_video-at, 1) * 100%),
transparent calc(var(--_video-at, 1) * 100%)
);

block-size: 4px;
bottom: var(--_video-level-lift);

direction: rtl;
inline-size: var(--_video-level-size);

left: 50%;
opacity: 0;
padding: var(--helix-space-none);
pointer-events: none;
position: absolute;
transition: opacity var(--helix-duration-fast) var(--helix-easing-standard);
translate: -50% 0;
}

[part="sound"]:hover [part="volume"],
[part="sound"]:focus-within [part="volume"] {
opacity: 1;
pointer-events: auto;
}

[part="sound"]:hover::after,
[part="sound"]:focus-within::after {
block-size: var(--_video-level-gap);
bottom: 100%;
content: "";
inline-size: var(--helix-size-icon-lg);
left: 50%;
position: absolute;
translate: -50% 0;
}

[part="sound"]:hover::before,
[part="sound"]:focus-within::before {
background-color: var(--helix-color-overlay);
border-radius: var(--helix-radii-full);
content: "";
block-size: calc(var(--_video-level-size) + var(--helix-space-xs) * 2);

bottom: calc(var(--_video-level-lift) - var(--helix-space-xs));
inline-size: var(--helix-size-icon-lg);
left: 50%;
position: absolute;
translate: -50% 0;
}

[part="scrubber"]::-webkit-slider-thumb,
[part="volume"]::-webkit-slider-thumb {
appearance: none;
background-color: currentColor;
block-size: 12px;
border: none;
border-radius: var(--helix-radii-full);
inline-size: 12px;
}

[part="scrubber"]::-moz-range-thumb,
[part="volume"]::-moz-range-thumb {
background-color: currentColor;
block-size: 12px;
border: none;
border-radius: var(--helix-radii-full);
inline-size: 12px;
}

:host([separation="filled"]) [part="sound"] {
--_video-level-gap: calc(var(--helix-space-xs) * 2);
}

[part="overflow"] {
display: contents;
}

[part="start"] {
all: unset;
--icon-size: 40%;

align-items: center;
aspect-ratio: 1;
background-color: var(--helix-color-overlay);
border-radius: var(--helix-radii-full);
box-shadow: 0 0 0 var(--helix-border-thin)
color-mix(in oklab, var(--helix-color-foreground) 40%, transparent);
box-sizing: border-box;
color: var(--helix-color-foreground);
cursor: pointer;
display: flex;

inline-size: var(
--video-start-size,
clamp(var(--helix-size-control-md), 15%, calc(var(--helix-size-control-lg) * 1.5))
);
inset-block-start: 50%;
inset-inline-start: 50%;
justify-content: center;
position: absolute;
transition: background-color var(--helix-duration-fast) var(--helix-easing-standard);
translate: -50% -50%;
}

[part="start"]:hover {
background-color: color-mix(
in oklab,
var(--helix-color-overlay) 88%,
var(--helix-color-foreground)
);
}

[part="start"]:focus-visible {
outline: var(--helix-size-focus-ring) solid var(--helix-color-focus-ring);
outline-offset: var(--helix-size-focus-offset);
}

[part="cue"] {
background-color: var(--helix-color-overlay);
border-radius: var(--helix-radii-sm);
color: var(--helix-color-foreground);
font-family: var(--helix-font-sans);
font-size: var(--helix-text-md);
inline-size: max-content;
inset-block-end: calc(var(--helix-size-icon-lg) + var(--helix-space-lg));
inset-inline-start: 50%;
margin: var(--helix-space-none);
max-inline-size: min(80%, 36rem);
padding: var(--helix-space-2xs) var(--helix-space-xs);
position: absolute;
text-align: center;
text-wrap: balance;
transition: inset-block-end var(--helix-duration-fast) var(--helix-easing-standard);
translate: -50% 0;
}

:host([data-idle]:not(:focus-within)) [part="cue"] {
inset-block-end: var(--helix-space-lg);
}

[part="poster"] {
display: block;
inset: 0;

pointer-events: none;
position: absolute;
}

[part="poster"]::slotted(*) {
pointer-events: auto;
}

[part="poster"]::slotted(*) {
block-size: 100%;
display: block;
inline-size: 100%;
object-fit: contain;
}

@media (prefers-reduced-motion: reduce) {
[part="controls"],
[part="cue"],
[part="stage"]::before,
[part="start"],
[part="volume"] {
transition: none;
}
}

[part="speed"] {
font-family: var(--helix-font-sans);
font-size: var(--helix-text-xs);
font-variant-numeric: tabular-nums;
font-weight: var(--helix-weight-medium);
min-inline-size: var(--video-speed-size, 2.5rem);
}

[part="remote"][aria-pressed="true"] {
color: var(--helix-color-primary);
}

[part="loading"],
[part="failure"] {
align-items: center;
background-color: color-mix(in oklab, var(--helix-color-surface-media) 72%, transparent);
border-radius: var(--helix-radii-md);
color: var(--helix-color-foreground-media);
display: flex;
font-family: var(--helix-font-sans);
font-size: var(--helix-text-sm);
gap: var(--helix-space-xs);
inset-block-start: 50%;
inset-inline-start: 50%;
padding: var(--helix-space-xs) var(--helix-space-sm);
position: absolute;
translate: -50% -50%;
}

[part="loading-mark"] {

animation: video-spin 0.8s linear infinite;
block-size: var(--helix-size-icon-sm);
border: var(--helix-border-thick) solid
color-mix(in oklab, var(--helix-color-foreground-media) 30%, transparent);
border-block-start-color: var(--helix-color-foreground-media);
border-radius: var(--helix-radii-full);
flex: 0 0 auto;
inline-size: var(--helix-size-icon-sm);
}

@keyframes video-spin {
to {
rotate: 1turn;
}
}

@media (prefers-reduced-motion: reduce) {
[part="loading-mark"] {
animation: none;
}
}

[part="back"] {
inset-block-start: var(--helix-space-sm);
inset-inline-start: var(--helix-space-sm);
opacity: inherit;
position: absolute;
z-index: var(--helix-layer-raised);
}

[part="back"]:not(:has(*)) {
display: none;
}

@media print {
:host {
display: none;
}
}`);var fq=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},_4=class W extends j{static{this.tier="helix-"}static{this.styles=[A0,bq]}};fq([q({reflect:!0})],_4.prototype,"separation",void 0);_4=fq([G("helix-video")],_4);var P5=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},CJ=class W extends A{constructor(){super(...arguments);this.value="",this.src="",this.poster="",this.disabled=!1,this.current=!1,this.choose=()=>{if(this.disabled)return;this.dispatchEvent(new m({value:this.value}))}}get text(){return[...this.childNodes].filter((J)=>!(J instanceof Element)||!J.hasAttribute("slot")).map((J)=>J.textContent??"").join("").trim()}renderMedia(){return F`<slot name="media">
      ${this.poster===""?z:F`<img part="thumbnail" alt="" src=${this.poster} />`}
    </slot>`}render(){return F`<div part="container" role="listitem">
      <button
        part="item"
        type="button"
        aria-current=${this.current?"true":z}
        ?disabled=${this.disabled}
        @click=${this.choose}
      >
        <span part="media">${this.renderMedia()}</span>
        <span part="label">
          <slot></slot>
          <slot name="meta"></slot>
        </span>
      </button>
    </div>`}};P5([q()],CJ.prototype,"value",void 0);P5([q()],CJ.prototype,"src",void 0);P5([q()],CJ.prototype,"poster",void 0);P5([q({reflect:!0,type:Boolean})],CJ.prototype,"disabled",void 0);P5([q({attribute:!1})],CJ.prototype,"current",void 0);CJ=P5([G("helix-headless-video-playlist-item")],CJ);var jq=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},Q8=class W extends t1(A){constructor(){super(...arguments);this.label="Playlist",this.chased=!1,this.handleSelect=(J)=>{J.stopImmediatePropagation(),this.chased=!0,this.requestActive(J.detail.value)},this.handleNext=()=>{this.chased=!0,this.step(1)},this.handlePrevious=()=>{this.chased=!0,this.step(-1)},this.handleEnded=()=>{this.chased=!0,this.step(1)}}get items(){return[...this.querySelectorAll("helix-video-playlist-item, helix-headless-video-playlist-item")].filter((J)=>J.value!=="")}get player(){return this.renderRoot?.querySelector('slot[name="player"]')?.assignedElements()[0]??null}step(J){let Z=this.items.filter((Y)=>!Y.disabled),K=Z.findIndex((Y)=>Y.value===this.resolveActive(Z)?.value),Q=Z[K+J];if(Q)this.requestActive(Q.value)}connectedCallback(){super.connectedCallback(),this.addEventListener("helix-select",this.handleSelect),this.addEventListener("helix-next",this.handleNext),this.addEventListener("helix-previous",this.handlePrevious),this.addEventListener("ended",this.handleEnded)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("helix-select",this.handleSelect),this.removeEventListener("helix-next",this.handleNext),this.removeEventListener("helix-previous",this.handlePrevious),this.removeEventListener("ended",this.handleEnded)}updated(J){super.updated?.(J);let Z=this.items,K=this.resolveActive(Z);for(let Y of Z)Y.current=Y===K;let Q=this.player;if(!Q||!K)return;if(Q.src!==K.src){if(Q.src=K.src,Q.poster=K.poster,Q.label=K.text,this.chased)Q.updateComplete?.then(()=>{Q.play()})}this.chased=!1}render(){return F`<div part="player"><slot name="player"></slot></div>
      <div part="items" role="list" aria-label=${this.label}>
        <slot></slot>
      </div>`}};jq([q()],Q8.prototype,"label",void 0);Q8=jq([G("helix-headless-video-playlist")],Q8);var hY=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},MF="helix-video-playlist-item, helix-headless-video-playlist-item",I5=class W extends A{constructor(){super(...arguments);this.label="Episodes",this.placement="top-end",this.reread=()=>{this.requestUpdate()},this.choose=(J)=>{this.dispatchEvent(new m({value:J}))}}#J;connectedCallback(){super.connectedCallback(),this.updateComplete.then(()=>this.watch())}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("helix-before-open",this.reread),this.#J?.disconnect(),this.#J=void 0}#Z;get playlist(){return this.#Z}get entries(){let J=this.playlist;return J?[...J.querySelectorAll(MF)]:[]}watch(){this.#Z??=h1(this,Q8)??void 0;let J=this.#Z;if(!J||this.#J)return;this.addEventListener("helix-before-open",this.reread),this.#J=new MutationObserver(this.reread),this.#J.observe(J,{childList:!0,subtree:!0}),this.reread()}render(){return this.renderMenu()}renderMenu(){let J=this.playlist?.active;return T`<${this.tag("menu")} part="menu"
    exportparts="back: menu-back, back-mark: menu-back-mark, empty: menu-empty, header: menu-header,
      loading: menu-loading, surface: menu-surface, title: menu-title" label=${this.label} placement=${this.placement}>
      <slot name="trigger" slot="trigger">
        <button part="trigger" type="button" aria-label=${this.label}>${x(R6)}</button>
      </slot>
      ${this.entries.map((Z)=>T`<${this.tag("menu-item")}
          part="entry"
      exportparts="item: entry-item, mark: entry-mark, start: entry-start"
          value=${Z.value}
          aria-checked=${Z.value===J?"true":"false"}
          ?disabled=${Z.disabled}
          role="menuitemradio"
          @helix-select=${(K)=>{K.stopPropagation(),this.choose(Z.value)}}
        >
          ${Z.poster===""?z:T`<img alt="" part="poster" slot="start" src=${Z.poster} />`}
          ${Z.text}
        </${this.tag("menu-item")}>`)}
    </${this.tag("menu")}>`}};hY([q()],I5.prototype,"label",void 0);hY([q()],I5.prototype,"placement",void 0);I5=hY([G("helix-headless-video-playlist-menu")],I5);var _q=N(`:host {
display: block;
}

[part="item"] {
all: unset;
box-sizing: border-box;

align-items: center;
background-color: var(--video-playlist-item-background-color, transparent);
border-radius: var(--helix-radii-sm);
cursor: pointer;
display: flex;
gap: var(--helix-space-sm);
inline-size: 100%;

padding: var(--helix-space-2xs) var(--helix-space-2xs) var(--helix-space-2xs)
var(--helix-space-sm);
position: relative;
text-align: start;
transition:
background-color var(--helix-duration-fast) var(--helix-easing-standard),
color var(--helix-duration-fast) var(--helix-easing-standard);
}

:host(:not([disabled])) [part="item"]:hover {
background-color: color-mix(in oklab, var(--helix-color-foreground) 8%, transparent);
}

[part="item"]:focus-visible {
outline: var(--helix-size-focus-ring) solid var(--helix-color-focus-ring);
outline-offset: calc(var(--helix-size-focus-offset) * -1);
}

[part="item"][aria-current="true"] {
background-color: color-mix(in oklab, var(--helix-color-foreground) 6%, transparent);
color: var(--helix-color-foreground);
}

[part="item"][aria-current="true"]::before {
background-color: var(--helix-color-primary);
border-radius: var(--helix-radii-full);
content: "";
inline-size: var(--helix-border-thick);
inset-block: var(--helix-space-2xs);
inset-inline-start: var(--helix-space-2xs);
position: absolute;
}

:host([disabled]) [part="item"] {
cursor: not-allowed;
opacity: 0.5;
}

[part="media"] {
aspect-ratio: 16 / 9;
border-radius: var(--helix-radii-sm);
flex: 0 0 auto;
inline-size: var(--video-playlist-media-size, 5rem);
overflow: hidden;
}

[part="media"] ::slotted(*),
[part="thumbnail"] {
block-size: 100%;
display: block;
inline-size: 100%;
object-fit: cover;
}

[part="label"] {
color: var(--helix-color-foreground);
display: flex;
flex-direction: column;
font-family: var(--helix-font-sans);
font-size: var(--helix-text-sm);
font-weight: var(--helix-weight-medium);
gap: var(--helix-space-2xs);
line-height: var(--helix-leading-tight);
min-inline-size: 0;
}

[part="label"] ::slotted([slot="meta"]) {
color: var(--helix-color-foreground-subtle);
font-size: var(--helix-text-xs);
font-weight: var(--helix-weight-regular);
}

@media (prefers-reduced-motion: reduce) {
[part="item"] {
transition: none;
}
}`);var SF=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},vq=class W extends CJ{static{this.styles=_q}};vq=SF([G("helix-video-playlist-item")],vq);var kq=N(`:host {
display: flex;
flex: 0 0 auto;
}

[part="trigger"] {
all: unset;

--icon-size: var(--video-playlist-menu-size, var(--helix-size-icon-sm));

align-items: center;
border-radius: var(--helix-radii-sm);
box-sizing: border-box;
color: var(--video-playlist-menu-color, inherit);
cursor: pointer;
display: flex;
flex: 0 0 auto;
justify-content: center;
min-block-size: var(--helix-size-icon-lg);
min-inline-size: var(--helix-size-icon-lg);
}

[part="trigger"]:focus-visible {
outline: var(--helix-size-focus-ring) solid var(--helix-color-focus-ring);
outline-offset: var(--helix-size-focus-offset);
}

[part="entry"] {
--menu-item-start: var(--video-playlist-menu-poster, calc(var(--helix-size-icon-lg) * 2));
}

[part="entry"]::part(item) {
padding-block: var(--helix-space-2xs);
}

[part="poster"] {
aspect-ratio: 16 / 9;
border-radius: var(--helix-radii-sm);
display: block;
inline-size: 100%;
object-fit: cover;
}`);var RF=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},Hq=class W extends I5{static{this.tier="helix-"}static{this.styles=[A0,kq]}};Hq=RF([G("helix-video-playlist-menu")],Hq);var uq=N(`:host {
display: grid;
gap: var(--helix-space-md);
grid-template-columns: var(--video-playlist-layout, 1fr);
}

[part="items"] {
display: flex;
flex-direction: column;
gap: var(--helix-space-2xs);
max-block-size: var(--video-playlist-size, 26rem);
overflow-y: auto;
}

@media print {
:host {
display: none;
}
}`);var EF=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},hq=class W extends Q8{static{this.styles=uq}};hq=EF([G("helix-video-playlist")],hq);var p9=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},$7=class W extends A{constructor(){super(...arguments);this.estimate=32,this.for="",this.label="",this.rows=[],this.virtualize=new Z6(this,{container:()=>this.renderRoot.querySelector('[part="viewport"]'),count:()=>this.rows.length,estimate:()=>this.estimate})}firstUpdated(J){super.firstUpdated?.(J),this.read()}updated(J){if(super.updated?.(J),J.has("for"))this.read();this.virtualize.measure(),this.place()}read(){let Z=(this.for===""?null:this.ownerDocument.getElementById(this.for))?.textContent??"";if(Z.trim()===""){this.rows=[];return}try{let K=JSON.parse(Z);this.rows=Array.isArray(K)?K:[]}catch{this.rows=[]}}place(){let J=this.querySelector("template");if(!J)return;for(let X of[...this.children])if(X!==J)X.remove();let{first:Z,last:K}=this.virtualize.window,Q=this.rows.length,Y=this.ownerDocument.createDocumentFragment();for(let X=Z;X<K;X+=1){let $=this.rows[X];if(!$)continue;let V=J.content.cloneNode(!0);for(let O of V.querySelectorAll("[data-field]"))O.textContent=$[O.dataset.field??""]??"";for(let O of V.children)O.setAttribute("role","listitem"),O.setAttribute("aria-posinset",String(X+1)),O.setAttribute("aria-setsize",String(Q));Y.append(V)}this.append(Y)}render(){let{after:J,before:Z}=this.virtualize.window;return F`<div
      data-scroller
      part="viewport"
      role="list"
      aria-label=${this.label}
      @scroll=${()=>this.virtualize.measure()}
    >
      <div part="before" style="block-size: ${Z}px"></div>
      <slot></slot>
      <div part="after" style="block-size: ${J}px"></div>
    </div>`}};p9([q({type:Number})],$7.prototype,"estimate",void 0);p9([q()],$7.prototype,"for",void 0);p9([q()],$7.prototype,"label",void 0);p9([U()],$7.prototype,"rows",void 0);$7=p9([G("helix-headless-virtual-list")],$7);var xq=N(`:host {
display: block;
}

[part="viewport"] {
block-size: var(--virtual-list-block-size, 20em);

margin-inline: calc(var(--helix-size-focus-reach) * -1);
overflow-y: auto;
overscroll-behavior: contain;
padding-inline: var(--helix-size-focus-reach);
}

[part="after"],
[part="before"] {
flex: none;
}

@media print {
:host {
box-shadow: none;
max-block-size: none;
overflow: visible;
}
}`);var wF=function(W,J,Z,K){var Q=arguments.length,Y=Q<3?J:K===null?K=Object.getOwnPropertyDescriptor(J,Z):K,X;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")Y=Reflect.decorate(W,J,Z,K);else for(var $=W.length-1;$>=0;$--)if(X=W[$])Y=(Q<3?X(Y):Q>3?X(J,Z,Y):X(J,Z))||Y;return Q>3&&Y&&Object.defineProperty(J,Z,Y),Y},yq=class W extends $7{static{this.styles=xq}};yq=wF([G("helix-virtual-list")],yq);var LJ=document.getElementById("preview-root"),v4=(W)=>window.parent?.postMessage(W,"*"),bF=["log","info","warn","error"];for(let W of bF){let J=console[W];console[W]=(...Z)=>{J(...Z),v4({level:W,text:Z.map((K)=>typeof K==="string"?K:_F(K)).join(" "),type:"helix-preview-console"})}}window.addEventListener("error",(W)=>{v4({level:"error",text:W.message,type:"helix-preview-console"})});window.addEventListener("message",(W)=>{if(W.data?.type!=="helix-preview-render"||W.source!==window.parent||!LJ)return;let{colorMode:J,direction:Z="ltr",layout:K="padded",source:Q="",styles:Y=""}=W.data;if(document.documentElement.dir=Z,LJ.dataset.layout=K,J)document.documentElement.dataset.colorMode=J,document.documentElement.style.colorScheme=J;LJ.innerHTML=Q.replace(/<link\b[^>]*\brel=(["'])stylesheet\1[^>]*>\s*/gi,""),jF(LJ);let X=document.getElementById("preview-styles");if(!X)X=document.createElement("style"),X.id="preview-styles",document.head.append(X);X.textContent=Y,mq()});var fF=(W)=>{let J=W.getBoundingClientRect();if(J.width>0||J.height>0)return[J];return[...W.querySelectorAll("*")].filter((Z)=>getComputedStyle(Z).position!=="fixed").map((Z)=>Z.getBoundingClientRect()).filter((Z)=>Z.width>0||Z.height>0)},mq=()=>{if(!LJ)return;let W=[...LJ.children].flatMap(fF);if(W.length===0)return;let J=Math.min(...W.map((Y)=>Y.top)),Z=Math.max(...W.map((Y)=>Y.bottom)),K=getComputedStyle(LJ),Q=(Number.parseFloat(K.paddingBlockStart)||0)+(Number.parseFloat(K.paddingBlockEnd)||0);v4({size:Math.ceil(Z-J+Q),type:"helix-preview-size"})};if(LJ)new ResizeObserver(mq).observe(LJ);v4({type:"helix-preview-ready"});function jF(W){for(let J of[...W.querySelectorAll("script")]){let Z=document.createElement("script");for(let{name:K,value:Q}of J.attributes)Z.setAttribute(K,Q);if(!Z.type)Z.type="module";Z.text=J.text,J.replaceWith(Z)}}function _F(W){try{return JSON.stringify(W)}catch{return String(W)}}})();
