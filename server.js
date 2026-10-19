// YUORA server: no npm packages needed. Requires Node.js 18 or newer. Run: node server.js
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const D=__dirname;
try{for(const l of fs.readFileSync(path.join(D,'.env'),'utf8').split('\n')){const m=l.match(/^\s*([A-Z_0-9]+)\s*=\s*(.*?)\s*$/);if(m&&!(m[1] in process.env))process.env[m[1]]=m[2].replace(/^["']|["']$/g,'')}}catch{}
const E=process.env,PORT=+E.PORT||3000,SHIP=Math.max(0,Math.round(+E.SHIPPING_INR||0));
const UPI_ID=String(E.UPI_ID||'').trim();
const WHATSAPP_NUMBER=String(E.WHATSAPP_NUMBER||'').replace(/\D/g,'');
const MANUAL_UPI=!!UPI_ID;
const DB=path.join(D,'data.json');
function save(){fs.writeFileSync(DB+'.tmp',JSON.stringify(db,null,1));fs.renameSync(DB+'.tmp',DB)}
let db;
try{db=JSON.parse(fs.readFileSync(DB,'utf8'))}catch{
  db={products:[],orders:[],audit:[],settings:{announcement:'Welcome to YUORA'}};
  for(let i=1;i<=7;i++)db.products.push({id:'p'+i,name:'Placeholder candle '+i,desc:'Draft placeholder. Add real details in the admin dashboard.',price:549+50*i,stock:0,coll:i%2?'Everyday':'Gifting',status:'draft',sku:'YUORA-'+i,col:'#E9DED0',ph:true,created:Date.now(),updated:Date.now()});
  save();
}
const audit=(a,d)=>{db.audit.unshift({t:Date.now(),a,d});db.audit=db.audit.slice(0,500)};
const send=(res,c,o)=>{res.writeHead(c,{'Content-Type':'application/json'});res.end(JSON.stringify(o))};
const readBody=(req,max=100000)=>new Promise((ok,no)=>{let b='';req.on('data',c=>{b+=c;if(b.length>max){no(new Error('big'));req.destroy()}});req.on('end',()=>ok(b));req.on('error',no)});
const eq=(a,b)=>{const x=crypto.createHash('sha256').update(String(a)).digest(),y=crypto.createHash('sha256').update(String(b)).digest();return crypto.timingSafeEqual(x,y)};
const hits=new Map();
const limited=(k,max,ms)=>{const n=Date.now(),a=(hits.get(k)||[]).filter(t=>n-t<ms);a.push(n);hits.set(k,a);return a.length>max};
const sessions=new Map();
const cookie=req=>Object.fromEntries((req.headers.cookie||'').split(';').map(s=>s.trim().split('=')).filter(x=>x[0]));
const isAdmin=req=>{const t=cookie(req).ya,e=t&&sessions.get(t);return !!e&&e>Date.now()};
const UP=path.join(D,'uploads'),IMG=/^[a-f0-9]{32}\.(jpg|png|webp)$/,MIME={jpg:'image/jpeg',png:'image/png',webp:'image/webp'};
const pub=p=>({imgs:p.imgs||[],id:p.id,name:p.name,desc:p.desc,price:p.price,originalPrice:Number.isFinite(+p.originalPrice)?+p.originalPrice:p.price,discountPercent:Number.isFinite(+p.discountPercent)?+p.discountPercent:0,stock:p.stock,coll:p.coll,col:p.col,ph:!!p.ph});
const hmac=(s,m)=>crypto.createHmac('sha256',s).update(m).digest('hex');
function markPaid(o,payId){ // idempotent: only the first call changes anything
  if(o.status!=='pending_payment')return false;
  for(const i of o.items){const p=db.products.find(x=>x.id===i.id);if(p){if(p.stock<i.n)o.note='Stock shortfall: review before shipping';p.stock=Math.max(0,p.stock-i.n)}}
  o.status='paid';o.pay.status='captured';o.pay.paymentId=payId;o.paidAt=Date.now();audit('order_paid',o.num);save();return true;
}
const STAT=['pending_payment','paid','processing','packed','shipped','out_for_delivery','delivered','cancelled','refund_pending','refunded'];
const view=o=>({num:o.num,status:o.status,items:o.items,subtotal:o.subtotal,shipping:o.shipping,total:o.total,ship:o.ship,created:o.created});
const str=(v,n)=>typeof v==='string'&&v.trim().length>0&&v.length<=n;
function validate(c){
  if(!c||typeof c!=='object')return 'Missing details';
  if(!str(c.name,80))return 'Enter your name';
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.email||'')||c.email.length>120)return 'Enter a valid email';
  const ph=String(c.phone||'').replace(/[\s-]/g,'').replace(/^(\+91|91|0)(?=\d{10}$)/,'');
  if(!/^[6-9]\d{9}$/.test(ph))return 'Enter a valid 10-digit Indian mobile number';
  c.phone=ph;
  if(!str(c.address,200))return 'Enter your delivery address';
  if(!str(c.city,60))return 'Enter your city';
  if(!str(c.state,60))return 'Enter your state';
  if(!/^[1-9]\d{5}$/.test(String(c.pin||'')))return 'Enter a valid 6-digit PIN code';
  return null;
}
const SEC={'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'same-origin','Content-Security-Policy':"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; frame-src 'self'; connect-src 'self'; img-src 'self' data: https://api.qrserver.com;"};
const page=(res,f)=>{try{const b=fs.readFileSync(path.join(D,f));res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(b)}catch{res.writeHead(404);res.end('Not found')}};

http.createServer(async(req,res)=>{
  for(const k in SEC)res.setHeader(k,SEC[k]);
  const u=new URL(req.url,'http://x'),p=u.pathname,ip=req.socket.remoteAddress;
  try{
    if(req.method==='GET'){
      if(p==='/')return page(res,'index.html');
      if(p==='/admin')return page(res,'admin.html');
      const teamPhotos=new Set(['pratik-kashyap.jpg','arya-rishikesh.jpg','supriya.jpg','ayushi.jpg','khushi.jpg','rishika.jpg','harshit.jpg','ravi-ranjan.jpg','satyam.jpg','asutosh.jpg']);
      if(teamPhotos.has(p.slice(1))){
        try { const b=fs.readFileSync(path.join(D,p.slice(1))); res.writeHead(200,{'Content-Type':'image/jpeg','Cache-Control':'public, max-age=3600'}); return res.end(b); }
        catch { res.writeHead(404); return res.end('Team photo not found'); }
      }
      if(p==='/hero.jpg'){
  try {
    const b = fs.readFileSync(path.join(D, 'hero.jpg'));
    res.writeHead(200, {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=3600'
    });
    return res.end(b);
  } catch {
    res.writeHead(404);
    return res.end('hero.jpg not found');
  }
}
      if(p.startsWith('/uploads/')){const n=p.slice(9);if(!IMG.test(n))return send(res,404,{error:'Not found'});try{const b=fs.readFileSync(path.join(UP,n));res.writeHead(200,{'Content-Type':MIME[n.split('.')[1]],'Cache-Control':'public, max-age=31536000, immutable'});return res.end(b)}catch{return send(res,404,{error:'Not found'})}}
      if(p==='/api/products')return send(res,200,db.products.filter(x=>x.status==='published').map(pub));
      if(p==='/api/config')return send(res,200,{announcement:db.settings.announcement,paymentsReady:MANUAL_UPI,manualUpiReady:MANUAL_UPI,shipping:Math.max(0,Math.round(Number.isFinite(+db.settings.shipping)?+db.settings.shipping:SHIP)),upiId:MANUAL_UPI?UPI_ID:'',whatsappNumber:WHATSAPP_NUMBER});
      if(p.startsWith('/api/order/')){
        if(limited('ol'+ip,30,600000))return send(res,429,{error:'Too many attempts. Try again later.'});
        const o=db.orders.find(x=>eq(x.token,p.slice(11)));return o?send(res,200,view(o)):send(res,404,{error:'Order not found'});
      }
      if(p==='/api/admin/data'){
        if(!isAdmin(req))return send(res,401,{error:'Not signed in'});
        return send(res,200,{products:db.products,orders:db.orders,audit:db.audit.slice(0,100),settings:db.settings,status:{manualUpi:MANUAL_UPI,shipping:Math.max(0,Math.round(Number.isFinite(+db.settings.shipping)?+db.settings.shipping:SHIP))}});
      }
      if(!p.startsWith('/api/')){res.writeHead(404,{'Content-Type':'text/html'});return res.end('<h1>Page not found</h1><a href="/">Back to YUORA</a>')}
      return send(res,404,{error:'Not found'});
    }
    if(req.method!=='POST')return send(res,405,{error:'Method not allowed'});
    if(p==='/api/admin/upload'&&!isAdmin(req))return send(res,401,{error:'Not signed in'});
    const raw=await readBody(req,p==='/api/admin/upload'?12e6:100000);
    if(!(req.headers['content-type']||'').includes('application/json'))return send(res,415,{error:'JSON required'});
    const b=raw?JSON.parse(raw):{};
    if(p==='/api/checkout'){
      if(limited('co'+ip,10,600000))return send(res,429,{error:'Too many attempts. Try again later.'});
      if(!MANUAL_UPI)return send(res,503,{error:'UPI payment is not configured. Set UPI_ID in the Render environment.'});
      const err=validate(b.customer);if(err)return send(res,400,{error:err});
      if(!Array.isArray(b.items)||!b.items.length||b.items.length>20)return send(res,400,{error:'Your cart is empty'});
      const items=[];let sub=0;
      for(const it of b.items){
        const pr=db.products.find(x=>x.id===it.id&&x.status==='published'),n=it.n;
        if(!pr||!Number.isInteger(n)||n<1||n>10)return send(res,400,{error:'An item in your cart is no longer available'});
        if(pr.stock<n)return send(res,400,{error:pr.name+' has only '+pr.stock+' in stock'});
        items.push({id:pr.id,name:pr.name,sku:pr.sku,price:pr.price,n});sub+=pr.price*n;
      }
      const shipping=Math.max(0,Math.round(Number.isFinite(+db.settings.shipping)?+db.settings.shipping:SHIP));const total=sub+shipping,c=b.customer;
      const o={num:'YU-'+(1001+db.orders.length),token:crypto.randomBytes(24).toString('hex'),status:'pending_payment',items,subtotal:sub,shipping,total,customer:{name:c.name.trim(),email:c.email,phone:c.phone,address:c.address.trim(),city:c.city.trim(),state:c.state.trim(),pin:c.pin},pay:{status:'created'},ship:{},created:Date.now()};
      // Manual UPI: the server calculates the total, including shipping, and creates a pending order.
      o.pay.status='awaiting_manual_payment';o.pay.method='upi_qr';
      db.orders.push(o);save();
      const upiUri='upi://pay?'+new URLSearchParams({pa:UPI_ID,pn:'YUORA',am:total.toFixed(2),cu:'INR',tn:'YUORA '+o.num}).toString();
      return send(res,200,{mode:'upi',upiId:UPI_ID,upiUri,amount:total*100,token:o.token,num:o.num,total,subtotal:sub,shipping});
    }
    if(p==='/api/admin/login'){
      if(!E.ADMIN_PASSWORD||E.ADMIN_PASSWORD.length<10)return send(res,503,{error:'Set ADMIN_PASSWORD (10+ characters) in .env first'});
      if(limited('al'+ip,5,900000))return send(res,429,{error:'Too many attempts. Wait 15 minutes.'});
      if(!eq(b.password||'',E.ADMIN_PASSWORD))return send(res,401,{error:'Wrong password'});
      const t=crypto.randomBytes(32).toString('hex');sessions.set(t,Date.now()+8*3600e3);
      res.setHeader('Set-Cookie','ya='+t+'; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800'+(E.COOKIE_SECURE==='1'?'; Secure':''));
      audit('admin_login',ip);save();return send(res,200,{ok:true});
    }
    if(!p.startsWith('/api/admin/'))return send(res,404,{error:'Not found'});
    if(!isAdmin(req))return send(res,401,{error:'Not signed in'});
    if(p==='/api/admin/logout'){sessions.delete(cookie(req).ya);return send(res,200,{ok:true})}
    if(p==='/api/admin/upload'){
      const m=/^data:image\/[a-z+]+;base64,([A-Za-z0-9+/=]+)$/.exec(b.data||'');if(!m)return send(res,400,{error:'Choose a JPG, PNG or WEBP image'});
      const buf=Buffer.from(m[1],'base64');if(buf.length>3e6||buf.length<20)return send(res,400,{error:'Image must be under 3 MB'});
      const ext=buf[0]===0xFF&&buf[1]===0xD8&&buf[2]===0xFF?'jpg':buf.slice(0,4).toString('hex')==='89504e47'?'png':(buf.slice(0,4).toString()==='RIFF'&&buf.slice(8,12).toString()==='WEBP')?'webp':null;
      if(!ext)return send(res,400,{error:'Only JPG, PNG or WEBP images are allowed'});
      fs.mkdirSync(UP,{recursive:true});const name=crypto.randomBytes(16).toString('hex')+'.'+ext;fs.writeFileSync(path.join(UP,name),buf);
      audit('image_upload',name);save();return send(res,200,{file:name});
    }
    if(p==='/api/admin/settings'){if(b.announcement!==undefined){if(!str(b.announcement,200))return send(res,400,{error:'Enter announcement text (max 200)'});db.settings.announcement=b.announcement.trim()}if(b.shipping!==undefined){const shipping=Number(b.shipping);if(!Number.isInteger(shipping)||shipping<0||shipping>100000)return send(res,400,{error:'Shipping charge must be a whole number from ₹0 to ₹100,000'});db.settings.shipping=shipping}audit('settings',JSON.stringify({announcement:db.settings.announcement,shipping:db.settings.shipping}));save();return send(res,200,{ok:true})}
    if(p==='/api/admin/product'){
      if(!str(b.name,100)||!str(b.coll,40))return send(res,400,{error:'Name and collection are required'});
      const originalPrice=Number(b.originalPrice===undefined?b.price:b.originalPrice);
      const discountPercent=Number(b.discountPercent===undefined?0:b.discountPercent);
      if(!Number.isInteger(originalPrice)||originalPrice<1||originalPrice>10000000||!Number.isFinite(discountPercent)||discountPercent<0||discountPercent>99||!Number.isInteger(b.stock)||b.stock<0)return send(res,400,{error:'Original price must be a whole rupee amount above 0, discount must be 0–99%, and stock must be 0 or more'});
      if(!['draft','published','archived'].includes(b.status))return send(res,400,{error:'Bad status'});
      const sellingPrice=Math.max(1,Math.round(originalPrice*(1-discountPercent/100)));
      let pr=db.products.find(x=>x.id===b.id);
      if(!pr){pr={id:'p'+Date.now().toString(36),created:Date.now()};db.products.push(pr)}
      Object.assign(pr,{name:b.name.trim(),desc:String(b.desc||'').slice(0,2000),price:sellingPrice,originalPrice,discountPercent,stock:b.stock,coll:b.coll.trim(),status:b.status,sku:String(b.sku||'').slice(0,40),imgs:(Array.isArray(b.imgs)?b.imgs:[]).filter(x=>IMG.test(x)).slice(0,5),col:/^#[0-9a-fA-F]{6}$/.test(b.col)?b.col:'#E9DED0',ph:!!b.ph,updated:Date.now()});
      audit('product',pr.name+' ('+pr.status+')');save();return send(res,200,{ok:true});
    }
    if(p==='/api/admin/order'){
      const o=db.orders.find(x=>x.num===b.num);if(!o)return send(res,404,{error:'Order not found'});
      if(!STAT.includes(b.status))return send(res,400,{error:'Bad status'});
      if(o.status==='pending_payment'&&b.status!=='cancelled'&&!(MANUAL_UPI&&b.status==='paid'))return send(res,400,{error:'Only verified payments can move an order past pending payment'});
      if(o.status==='pending_payment'&&b.status==='paid'&&MANUAL_UPI){o.pay.status='manually_verified';o.paidAt=Date.now();for(const i of o.items){const pr=db.products.find(x=>x.id===i.id);if(pr)pr.stock=Math.max(0,pr.stock-i.n)}audit('manual_payment_verified',o.num)}
      o.status=b.status;o.ship={carrier:String(b.carrier||'').slice(0,60),tracking:String(b.tracking||'').slice(0,80),url:/^https:\/\//.test(b.url||'')?b.url.slice(0,300):''};
      audit('order',o.num+' -> '+b.status);save();return send(res,200,{ok:true});
    }
    return send(res,404,{error:'Not found'});
  }catch(e){console.error(e.message);send(res,500,{error:'Something went wrong. Please try again.'})}
}).listen(PORT,()=>console.log('YUORA running at http://localhost:'+PORT+'  Admin: /admin  UPI '+(MANUAL_UPI?'configured':'NOT configured')));
