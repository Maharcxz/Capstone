import{V as d}from"./virtual-try-on-CN7LyYq1.js";/* empty css                     */class u{constructor(t){this.virtualTryOn=t,this.xrSession=null,this.xrRefSpace=null,this.xrRenderer=null,this.arButton=null,this.isARActive=!1,this.arSupported=!1,this.arScene=null,this.arCamera=null,this.arGlassesModel=null,this.init()}async init(){console.log("🔄 Initializing WebXR Manager..."),this.arSupported=await this.checkWebXRSupport(),this.arSupported?(this.createARButton(),console.log("✅ WebXR AR support detected")):(console.log("❌ WebXR AR not supported on this device"),this.showARNotSupported())}async checkWebXRSupport(){if(!navigator.xr)return console.log("WebXR not available"),!1;try{return await navigator.xr.isSessionSupported("immersive-ar")}catch(t){return console.error("Error checking WebXR support:",t),!1}}createARButton(){this.arButton=document.createElement("button"),this.arButton.id="ar-button",this.arButton.className="ar-button",this.arButton.innerHTML=`
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                <path d="M8 21L9.09 15.26L16 14L9.09 13.74L8 8L6.91 13.74L0 14L6.91 15.26L8 21Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
            </svg>
            <span>Try in AR</span>
        `,this.arButton.addEventListener("click",()=>{this.isARActive?this.endARSession():this.startARSession()}),(document.querySelector(".controls-container")||document.body).appendChild(this.arButton),this.addARButtonStyles()}addARButtonStyles(){const t=document.createElement("style");t.textContent=`
            .ar-button {
                display: flex;
                align-items: center;
                gap: 8px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                padding: 12px 20px;
                border-radius: 25px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
                margin: 10px;
                position: relative;
                overflow: hidden;
            }
            
            .ar-button:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
            }
            
            .ar-button:active {
                transform: translateY(0);
            }
            
            .ar-button.active {
                background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
                box-shadow: 0 4px 15px rgba(255, 107, 107, 0.4);
            }
            
            .ar-button svg {
                width: 20px;
                height: 20px;
            }
            
            .ar-not-supported {
                background: #6c757d;
                color: #fff;
                padding: 10px 15px;
                border-radius: 5px;
                margin: 10px;
                text-align: center;
                font-size: 14px;
            }
        `,document.head.appendChild(t)}async startARSession(){if(!this.arSupported){this.showARNotSupported();return}try{console.log("🔄 Starting AR session..."),this.xrSession=await navigator.xr.requestSession("immersive-ar",{requiredFeatures:["local"],optionalFeatures:["dom-overlay","hit-test"]}),await this.setupARSession(),this.isARActive=!0,this.updateARButton(),console.log("✅ AR session started successfully")}catch(t){console.error("❌ Failed to start AR session:",t),this.showARError("Failed to start AR session. Please try again.")}}async setupARSession(){this.xrRefSpace=await this.xrSession.requestReferenceSpace("local"),this.virtualTryOn.renderer&&(this.xrRenderer=this.virtualTryOn.renderer,this.xrRenderer.xr.enabled=!0,this.xrRenderer.xr.setSession(this.xrSession)),this.virtualTryOn.glassesModel&&(this.arGlassesModel=this.virtualTryOn.glassesModel.clone(),this.arScene=this.virtualTryOn.scene,this.arCamera=this.virtualTryOn.camera),this.xrSession.addEventListener("end",()=>{this.endARSession()}),this.xrSession.requestAnimationFrame(this.onARFrame.bind(this))}onARFrame(t,e){if(!this.xrSession||!this.isARActive)return;const i=e.session;e.getViewerPose(this.xrRefSpace)&&(this.virtualTryOn.faceDetected&&this.arGlassesModel&&this.updateARGlassesPosition(),this.xrRenderer&&this.arScene&&this.arCamera&&this.xrRenderer.render(this.arScene,this.arCamera)),i.requestAnimationFrame(this.onARFrame.bind(this))}updateARGlassesPosition(){if(!this.arGlassesModel||!this.virtualTryOn.faceLandmarks)return;const t=this.virtualTryOn.faceLandmarks,e=t[33],i=t[263],o=t[1];if(e&&i&&o){const s={x:(e.x+i.x)/2,y:(e.y+i.y)/2,z:(e.z+i.z)/2};this.arGlassesModel.position.set((s.x-.5)*2,-(s.y-.5)*2,s.z-.1);const h=Math.atan2(i.y-e.y,i.x-e.x);this.arGlassesModel.rotation.z=h}}endARSession(){this.xrSession&&(this.xrSession.end(),this.xrSession=null),this.xrRenderer&&(this.xrRenderer.xr.enabled=!1,this.xrRenderer.xr.setSession(null)),this.isARActive=!1,this.updateARButton(),console.log("✅ AR session ended")}updateARButton(){this.arButton&&(this.isARActive?(this.arButton.classList.add("active"),this.arButton.innerHTML=`
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="6" y="6" width="12" height="12" stroke="currentColor" stroke-width="2"/>
                </svg>
                <span>Exit AR</span>
            `):(this.arButton.classList.remove("active"),this.arButton.innerHTML=`
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                    <path d="M8 21L9.09 15.26L16 14L9.09 13.74L8 8L6.91 13.74L0 14L6.91 15.26L8 21Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                </svg>
                <span>Try in AR</span>
            `))}showARNotSupported(){const t=document.createElement("div");t.className="ar-not-supported",t.textContent="AR not supported on this device",(document.querySelector(".controls-container")||document.body).appendChild(t)}showARError(t){this.virtualTryOn&&this.virtualTryOn.showError?this.virtualTryOn.showError(t):alert(t)}destroy(){this.isARActive&&this.endARSession(),this.arButton&&this.arButton.remove()}}class a{constructor(){this.virtualTryOn=null,this.webXRManager=null,this.isInitialized=!1}async init(){console.log("🚀 Initializing Virtual Try-On Application...");try{this.virtualTryOn=new d,await this.virtualTryOn.init(),this.webXRManager=new u(this.virtualTryOn),this.setupEventListeners(),this.isInitialized=!0,console.log("✅ Virtual Try-On Application initialized successfully")}catch(t){console.error("❌ Failed to initialize Virtual Try-On Application:",t),this.showError("Failed to initialize the application. Please refresh and try again.")}}setupEventListeners(){document.addEventListener("visibilitychange",()=>{document.hidden?this.pause():this.resume()}),window.addEventListener("beforeunload",()=>{this.cleanup()}),window.addEventListener("resize",()=>{this.virtualTryOn&&this.virtualTryOn.handleResize()}),window.addEventListener("orientationchange",()=>{setTimeout(()=>{this.virtualTryOn&&this.virtualTryOn.handleResize()},100)})}pause(){this.virtualTryOn&&this.virtualTryOn.faceDetectionActive&&(this.virtualTryOn.faceDetectionActive=!1)}resume(){this.virtualTryOn&&(this.virtualTryOn.faceDetectionActive||(this.virtualTryOn.faceDetectionActive=!0))}cleanup(){this.webXRManager&&this.webXRManager.destroy(),this.virtualTryOn&&this.virtualTryOn.destroy()}showError(t){const e=document.createElement("div");e.className="error-message",e.textContent=t,e.style.cssText=`
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #ff4757;
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 500;
            z-index: 10000;
            max-width: 400px;
            text-align: center;
            box-shadow: 0 4px 15px rgba(255, 71, 87, 0.3);
        `,document.body.appendChild(e),setTimeout(()=>{e.parentNode&&e.parentNode.removeChild(e)},5e3)}}let r=null;function n(){r||(r=new a,r.init())}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",n):n();window.VirtualTryOnApp=a;window.initializeVirtualTryOn=n;export{a as VirtualTryOnApp,n as initializeApp};
//# sourceMappingURL=main-v_mMUlmu.js.map
