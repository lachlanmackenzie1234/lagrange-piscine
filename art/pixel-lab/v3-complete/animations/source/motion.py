"""Pixel-native motion studies built from the approved v3 sprites."""
import math
import colorsys
import numpy as np
from PIL import Image,ImageDraw

def feet(im):
    a=np.array(im)[:,:,3];ys,xs=np.where(a>0)
    if not len(xs):return [im.width//2,im.height-1]
    bottom=int(ys.max());_,xx=np.where(a[max(0,bottom-2):bottom+1]>0)
    return [int(round(float(xx.mean()))),min(im.height-1,bottom+1)]

def pose(base,kind,index,direction='south'):
    a=np.array(base);height,width=a.shape[:2];out=np.zeros_like(a)
    ay,ax=np.where(a[max(0,height-4):,:,3]>0)
    foot_min=int(ax.min()) if len(ax) else width//3
    foot_max=int(ax.max()) if len(ax) else width*2//3
    centre=float(ax.mean()) if len(ax) else width/2
    leg_top=height-7
    stride=[0,1,1,0,0,-1,-1,0][index%8] if kind=='walk' else 0
    bob=-1 if kind=='idle' and index%4==2 or kind=='walk' and index%8 not in (0,4) else 0
    lean=0
    if kind=='cast':lean=[0,-1,0,1,1,0][index%6]
    if kind=='attack':lean=[0,-1,0,1,1,0][index%6]
    if kind=='victory':bob=-1 if index%4 in (1,2) else 0
    for y in range(height):
        for x in range(width):
            if a[y,x,3]==0:continue
            dx=0;dy=0
            is_leg=y>=leg_top and foot_min-1<=x<=foot_max+1
            if kind=='walk' and is_leg:
                side=-1 if x<centre else 1
                if direction in ('east','west'):
                    dx=side*stride;dy=-1 if side*stride<0 else 0
                else:
                    dy=side*stride
                    if index%8 in (2,6):dx=side
            elif not is_leg:
                dy=bob
                if lean:dx=lean if direction!='west' else -lean
                if kind=='crouch':dy=1 if index%4 in (1,2) else 0
            if kind=='swim':
                dy=([0,-1,0,0,1,0][index%6] if y>height*.35 and (x<width*.22 or x>width*.78) else 0)
            xx=x+dx;yy=y+dy
            if not 0<=xx<width or not 0<=yy<height:
                raise ValueError(f'Pose clipped pixels: {kind} {index} {direction} at {(xx,yy)}')
            out[yy,xx]=a[y,x]
    if bob:
        for x in range(max(0,foot_min-1),min(width,foot_max+2)):
            if a[leg_top,x,3] and not out[leg_top-1,x,3]:out[leg_top-1,x]=a[leg_top,x]
    if kind=='hit' and index%4 in (1,2):
        mask=(out[:,:,3]>0)&(out[:,:,:3].sum(axis=2)>190)
        rgb=out[:,:,:3].astype(float);target=np.array([255,241,214])
        rgb[mask]=rgb[mask]*.30+target*.70;out[:,:,:3]=rgb.astype(np.uint8)
    if kind in ('spawn','defeat'):
        level=([0,.2,.4,.65,.85,1][index%6] if kind=='spawn' else [1,.85,.65,.4,.2,0][index%6])
        for y in range(height):
            for x in range(width):
                if ((x*13+y*7)%20)/20>=level:out[y,x]=0
    return Image.fromarray(out)

def colour(hex):return tuple(int(hex[i:i+2],16) for i in (1,3,5))
def tint(c,amount):return tuple(round(v+(255-v)*amount) for v in c)

def dot(draw,x,y,c,size=1):
    x=int(round(x));y=int(round(y));draw.rectangle((x,y,x+size-1,y+size-1),fill=(*c,255))

def star(draw,x,y,c,r=2):
    x=int(round(x));y=int(round(y));draw.line((x-r,y,x+r,y),fill=(*c,255));draw.line((x,y-r,x,y+r),fill=(*c,255));dot(draw,x,y,tint(c,.55))

def aura(style,index,hex,rank=3):
    back=Image.new('RGBA',(48,48));front=Image.new('RGBA',(48,48));bd=ImageDraw.Draw(back);fd=ImageDraw.Draw(front)
    c=colour(hex);bright=tint(c,.48);phase=index/8*math.tau
    radius=13+rank;depth=3+(rank>=4)
    samples=40 if style.startswith('set-') else 14+rank*5
    for i in range(samples):
        if (i+index)%3==0:continue
        angle=i/samples*math.tau
        x=24+math.cos(angle)*radius;y=40+math.sin(angle)*depth
        d=fd if math.sin(angle)>=0 else bd
        dot(d,x,y,bright if (i+index)%4==0 else c)
    if rank>=5:
        for i in range(20):
            a=i/20*math.tau;x=24+math.cos(a)*(radius+2);y=40+math.sin(a)*(depth+2)
            if (i+index)%2==0:dot(fd if math.sin(a)>=0 else bd,x,y,bright)
    count=5 if style.startswith('set-') else max(2,rank)
    for i in range(count):
        a=phase+i/count*math.tau
        x=24+math.cos(a)*(12+rank)
        y=27+math.sin(a)*10-((index+i*2)%8)*.45
        d=fd if y>34 else bd
        if style=='set-EC':
            xx=int(round(x));yy=int(round(y));d.rectangle((xx-1,yy-1,xx+1,yy+1),outline=(*c,255));dot(d,xx-1,yy-1,bright)
        elif style=='set-AG':
            dot(d,x,y,c,2);dot(d,x-1,y+1,bright);dot(d,x+2,y-1,c)
        elif style=='set-EP':star(d,x,y,c,2)
        elif style=='set-EPP':
            xx=int(round(x));yy=int(round(y));d.line([(xx,yy-2),(xx+2,yy),(xx,yy+2),(xx-2,yy),(xx,yy-2)],fill=(*bright,255))
        elif style=='set-GP':
            xx=int(round(x));yy=int(round(y));d.rectangle((xx-1,yy-2,xx+1,yy),outline=(*c,255));d.line((xx,yy,xx,yy+3),fill=(*bright,255));dot(d,xx+1,yy+2,c)
        elif rank<=2:dot(d,x,y,bright if i%2 else c)
        elif rank==3:star(d,x,y,c,1)
        elif rank==4:
            xx=int(round(x));yy=int(round(y));d.polygon([(xx,yy-2),(xx+2,yy),(xx,yy+2),(xx-2,yy)],fill=(*c,255));dot(d,x,y,bright)
        else:star(d,x,y,c,2)
    if rank==6:
        for i in range(5):star(bd,10+i*7,8+((i+index)%3),bright,1)
    return back,front

def effect(name,index,icon=None):
    im=Image.new('RGBA',(64,64));d=ImageDraw.Draw(im);p=index/7
    if index==7:return im
    blue=(80,163,224);mint=(132,222,200);cream=(255,246,208);gold=(231,170,58);red=(225,90,88)
    radius=3+index*3
    if name=='perche':
        x=14+index*5;y=30-round(math.sin(p*math.pi)*11)
        d.line((x-14,y+18,x,y),fill=(106,73,44,255),width=2)
        d.rectangle((x-4,y-6,x+5,y+4),outline=(*blue,255));d.line((x-3,y-5,x+4,y+3),fill=(*cream,255));d.line((x+3,y-5,x-3,y+3),fill=(*blue,255))
        if index>=3:star(d,32,32,cream,3)
    elif name=='balai':
        x=8+index*6;y=39
        d.line((x+7,y-26,x,y-2),fill=(118,76,44,255),width=2);d.rectangle((x-7,y-3,x+7,y),fill=(74,131,164,255))
        for j in range(-6,7,3):d.line((x+j,y,x+j,y+5),fill=(*cream,255))
        for j in range(4):dot(d,x-8-j*3,y+7-(j%2)*3,gold)
    elif name=='robot':
        x=3+index*6
        if icon:im.paste(icon,(x,29),icon)
        for j in range(4):dot(d,x-3-j*3,38+j%2*2,blue,2)
        if index in (4,5):star(d,44,30,cream,3)
    elif name=='choc':
        for i in range(8):
            a=i/8*math.tau+index*.14;x=32+math.cos(a)*radius;y=32+math.sin(a)*radius
            star(d,x,y,blue if i%2 else cream,1+(index<3))
        if index<5:star(d,32,32,cream,8-index)
    elif name=='phm':
        if index<3:
            y=6+index*8;d.polygon([(32,y-4),(27,y+4),(28,y+7),(35,y+7),(37,y+3)],fill=(*red,255));dot(d,31,y+2,cream,2)
        else:
            rr=4+(index-3)*6;d.ellipse((32-rr,35-rr//3,32+rr,35+rr//3),outline=(*red,255));star(d,32,30,gold,2)
    elif name=='floc':
        rr=max(3,23-index*3)
        for i in range(10):
            a=i/10*math.tau;x=32+math.cos(a)*rr;y=26+math.sin(a)*rr
            dot(d,x,y,cream if i%2 else mint,2)
        if index>3:d.rectangle((29,27+index,35,32+index),fill=(*mint,255));star(d,31,30+index,cream,1)
    elif name=='lavage':
        for arm in (0,1):
            for j in range(13):
                a=index*.65+j*.13+arm*math.pi;rr=9+j*.5;x=32+math.cos(a)*rr;y=31+math.sin(a)*rr*.7
                dot(d,x,y,blue if arm else mint,2)
            star(d,x,y,cream,1)
    elif name in ('impact','critical'):
        c=gold if name=='critical' else cream
        for i in range(6):
            a=i/6*math.tau;rr=4+index*2;x=32+math.cos(a)*rr;y=32+math.sin(a)*rr
            d.line((32+math.cos(a)*2,32+math.sin(a)*2,x,y),fill=(*c,255),width=1+(index<2))
    elif name=='heal':
        for i in range(3):star(d,20+i*12,45-index*5-(i%2)*6,mint,3)
    elif name in ('spawn','level-up'):
        c=gold if name=='level-up' else blue
        d.ellipse((32-radius,40-radius//4,32+radius,40+radius//4),outline=(*c,255))
        for i in range(5):star(d,15+i*8,35-index*3+(i%2)*4,c,1+(index<3))
    elif name in ('poof','flee-dust'):
        for i in range(7):
            a=i*2.4;x=32+math.cos(a)*(index*2+2);y=38+math.sin(a)*(index+2)
            size=max(1,5-index//2);d.rectangle((int(x),int(y),int(x)+size,int(y)+size),fill=(186,188,184,255))
    elif name in ('xp','coin'):
        if icon:im.paste(icon,(24,38-index*4),icon)
        star(d,20,39-index*3,gold,1);star(d,43,31-index*2,cream,1)
    elif name in ('alert','question'):
        y=20-round(math.sin(p*math.pi)*5)
        if name=='alert':d.rectangle((30,y,33,y+9),fill=(*gold,255));d.rectangle((30,y+13,33,y+15),fill=(*gold,255))
        else:
            d.line([(28,y+3),(28,y),(35,y),(36,y+4),(32,y+8),(32,y+10)],fill=(160,114,202,255),width=2);dot(d,32,y+14,(160,114,202),2)
    elif name=='test':
        d.rectangle((25,19,39,41),outline=(49,67,92,255));d.rectangle((27,21,31,38),fill=(*cream,255));d.rectangle((34,21,38,38),fill=(*cream,255))
        fill_y=36-min(12,index*2);d.rectangle((27,fill_y,31,38),fill=(*gold,255));d.rectangle((34,fill_y,38,38),fill=(*red,255))
        if index>3:star(d,42,19,cream,2)
    elif name=='drop':
        for i in range(3):
            yy=10+index*5-i*6
            if yy>4:dot(d,27+i*5,yy,cream,3)
        if index>3:d.ellipse((19,39,47,44),outline=(*blue,255))
    elif name=='scatter':
        for i in range(16):
            xx=10+(i*13)%43;yy=8+((i*9+index*5)%39)
            dot(d,xx,yy,cream if i%3 else mint,1+(i%5==0))
    return im

def loot(base,index,kind,hex):
    out=Image.new('RGBA',(32,32));d=ImageDraw.Draw(out);col=colour(hex)
    if kind=='drop':
        yy=[1,5,11,16,13,15,16,16][index];out.paste(base,(8,yy),base)
        if index in (3,4,5):
            for dx in (-7,-4,16,20):dot(d,8+dx,30-index%2,(192,169,121))
    else:
        out.paste(base,(8,16),base)
        if index>1:
            top=base.crop((0,0,16,6));clear=Image.new('RGBA',(16,6));out.paste(clear,(8,16));out.paste(top,(8,16-min(7,index)),top)
            for i in range(3):star(d,9+i*7,16-index-(i%2)*3,tint(col,.35),1)
            if index>=4:star(d,16,12,col,3)
    return out
