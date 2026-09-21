import {deflateSync} from 'node:zlib';
const colors=new Map();
function rgba(value){
  if(!colors.has(value)){
    if(!/^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(value))throw Error('Unsupported pixel colour: '+value);
    const s=value.length===4?'#'+[...value.slice(1)].map(c=>c+c).join(''):value,n=parseInt(s.slice(1),16);colors.set(value,[n>>16&255,n>>8&255,n&255,255]);
  }return colors.get(value);
}
export class Canvas {
  constructor(w=0,h=0){this._width=w;this._height=h;this.data=new Uint8ClampedArray(w*h*4);this.context={fillStyle:'#000000',imageSmoothingEnabled:false,fillRect:(x,y,w,h)=>this.rect(x,y,w,h,this.context.fillStyle),drawImage:(im,x,y,w=im.width,h=im.height)=>this.blit(im,x,y,w,h),getImageData:()=>({data:this.data})};}
  get width(){return this._width;} set width(v){this._width=v;this.data=new Uint8ClampedArray(v*this._height*4);}
  get height(){return this._height;} set height(v){this._height=v;this.data=new Uint8ClampedArray(this._width*v*4);}
  getContext(type){if(type!=='2d')throw Error('Only 2D is supported');return this.context;}
  rect(x,y,w,h,c){const col=rgba(c);for(let py=Math.max(0,Math.round(y));py<Math.min(this.height,Math.round(y+h));py++)for(let px=Math.max(0,Math.round(x));px<Math.min(this.width,Math.round(x+w));px++)this.data.set(col,(py*this.width+px)*4);return this;}
  dot(x,y,c){return this.rect(x,y,1,1,c);}
  line(x0,y0,x1,y1,c){let dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1,e=dx+dy;for(;;){this.dot(x0,y0,c);if(x0===x1&&y0===y1)break;const e2=e*2;if(e2>=dy){e+=dy;x0+=sx;}if(e2<=dx){e+=dx;y0+=sy;}}return this;}
  blit(im,x,y,w=im.width,h=im.height){
    if(!Number.isInteger(w/im.width)||!Number.isInteger(h/im.height))throw Error('Only integer image scaling is supported');
    const scaleX=w/im.width,scaleY=h/im.height;
    for(let py=0;py<im.height;py++)for(let px=0;px<im.width;px++){
      const i=(py*im.width+px)*4;if(!im.data[i+3])continue;
      if(im.data[i+3]!==255)throw Error('Native source requires binary alpha');
      const col='#'+[...im.data.slice(i,i+3)].map(v=>v.toString(16).padStart(2,'0')).join('');this.rect(x+px*scaleX,y+py*scaleY,scaleX,scaleY,col);
    }return this;
  }
}
const table=Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function crc(b){let n=0xffffffff;for(const v of b)n=table[(n^v)&255]^(n>>>8);return(n^0xffffffff)>>>0;}
function chunk(type,data){const t=Buffer.from(type),head=Buffer.alloc(4),tail=Buffer.alloc(4);head.writeUInt32BE(data.length);tail.writeUInt32BE(crc(Buffer.concat([t,data])));return Buffer.concat([head,t,data,tail]);}
export function png(c){const header=Buffer.alloc(13);header.writeUInt32BE(c.width);header.writeUInt32BE(c.height,4);header[8]=8;header[9]=6;const stride=c.width*4,raw=Buffer.alloc((stride+1)*c.height);for(let y=0;y<c.height;y++)Buffer.from(c.data.slice(y*stride,(y+1)*stride)).copy(raw,y*(stride+1)+1);return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);}
const FONT={
  A:'01110/10001/10001/11111/10001/10001/10001',B:'11110/10001/10001/11110/10001/10001/11110',C:'01111/10000/10000/10000/10000/10000/01111',D:'11110/10001/10001/10001/10001/10001/11110',E:'11111/10000/10000/11110/10000/10000/11111',F:'11111/10000/10000/11110/10000/10000/10000',G:'01111/10000/10000/10111/10001/10001/01110',H:'10001/10001/10001/11111/10001/10001/10001',I:'11111/00100/00100/00100/00100/00100/11111',J:'00111/00010/00010/00010/10010/10010/01100',K:'10001/10010/10100/11000/10100/10010/10001',L:'10000/10000/10000/10000/10000/10000/11111',M:'10001/11011/10101/10101/10001/10001/10001',N:'10001/11001/10101/10011/10001/10001/10001',O:'01110/10001/10001/10001/10001/10001/01110',P:'11110/10001/10001/11110/10000/10000/10000',Q:'01110/10001/10001/10001/10101/10010/01101',R:'11110/10001/10001/11110/10100/10010/10001',S:'01111/10000/10000/01110/00001/00001/11110',T:'11111/00100/00100/00100/00100/00100/00100',U:'10001/10001/10001/10001/10001/10001/01110',V:'10001/10001/10001/10001/10001/01010/00100',W:'10001/10001/10001/10101/10101/10101/01010',X:'10001/10001/01010/00100/01010/10001/10001',Y:'10001/10001/01010/00100/00100/00100/00100',Z:'11111/00001/00010/00100/01000/10000/11111',
  0:'01110/10001/10011/10101/11001/10001/01110',1:'00100/01100/00100/00100/00100/00100/01110',2:'01110/10001/00001/00010/00100/01000/11111',3:'11110/00001/00001/01110/00001/00001/11110',4:'00010/00110/01010/10010/11111/00010/00010',5:'11111/10000/10000/11110/00001/00001/11110',6:'01110/10000/10000/11110/10001/10001/01110',7:'11111/00001/00010/00100/01000/01000/01000',8:'01110/10001/10001/01110/10001/10001/01110',9:'01110/10001/10001/01111/00001/00001/01110',
  '-':'00000/00000/00000/11111/00000/00000/00000','/':'00001/00001/00010/00100/01000/10000/10000',':':'00000/00100/00100/00000/00100/00100/00000','.':'00000/00000/00000/00000/00000/00100/00100','+':'00000/00100/00100/11111/00100/00100/00000',
};
export function text(c,value,x,y,color='#293849',scale=1){for(const [i,ch]of [...String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase()].entries()){const rows=FONT[ch]?.split('/')||[];rows.forEach((row,yy)=>[...row].forEach((v,xx)=>{if(v==='1')c.rect(x+(i*6+xx)*scale,y+yy*scale,scale,scale,color);}));}}
