/* Reading cards: text stays readable and complete, without profile metadata. */
(function () {
  'use strict';
  const HAND = '"MomsHand", "Gowun Batang", serif';
  const FONT = '"Gowun Batang", "Noto Serif KR", serif';
  const TEMPLATES = {
    1: { name:'손편지', background:'#fff5f2', ink:'#935569', paper:'#fffaf4', art:'img/cards/letter-desk.png' },
    2: { name:'커피 한 잔', background:'#f4e9dc', ink:'#795e45', paper:'#fffaf2', art:'img/cards/coffee-desk.png' },
    3: { name:'나의 책 정원', background:'#fff8f0', ink:'#99556b', paper:'#fffdf8', art:'img/garden/journal-garden.png', garden:true },
    4: { name:'꽃갈피', background:'#f7ede8', ink:'#976173', paper:'#fff9f2', art:'img/cards/flower-desk.png' },
    5: { name:'밤의 서재', background:'#e9dfd7', ink:'#65534e', paper:'#faf1e4', art:'img/cards/night-desk.png', footerInk:'#f5e7cf' },
    6: { name:'피크닉 독서', background:'#f1eee0', ink:'#68765b', paper:'#fffdf2', art:'img/cards/picnic-desk.png' },
    7: { name:'동물 친구', background:'#fdf0e4', ink:'#916746', paper:'#fffaf0', art:'img/cards/animal-friends.png', child:true },
    8: { name:'낙서 공책', background:'#fcebef', ink:'#976477', paper:'#fffdf7', art:'img/cards/kids-notebook.png', child:true },
    9: { name:'오늘의 한 장', background:'#fae9ee', ink:'#985e73', paper:'#fffcf5', art:'img/cards/reading-scrapbook.png', scrapbook:true }
  };
  function loadImage(src) {
    if (!src) return Promise.resolve(null);
    return new Promise(resolve => {
      const image = new Image(); image.crossOrigin = 'anonymous';
      const timer = setTimeout(() => resolve(null), 5000);
      image.onload = () => { clearTimeout(timer); resolve(image); };
      image.onerror = () => { clearTimeout(timer); resolve(null); };
      image.src = src;
    });
  }
  function wrap(ctx, text, width) {
    const lines = [];
    String(text || '').split('\n').forEach(paragraph => {
      let line = '';
      for (const char of paragraph) {
        if (line && ctx.measureText(line + char).width > width) { lines.push(line); line = ''; }
        line += char;
      }
      lines.push(line);
    });
    return lines;
  }
  function rounded(ctx,x,y,w,h,r,color) {
    ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();
  }
  function wordmark(ctx,ink) {
    ctx.strokeStyle=ink;ctx.lineWidth=3;ctx.lineJoin='round';
    ctx.beginPath();ctx.moveTo(98,83);ctx.quadraticCurveTo(115,77,134,86);
    ctx.quadraticCurveTo(153,77,170,83);ctx.lineTo(170,117);
    ctx.quadraticCurveTo(152,111,134,120);ctx.quadraticCurveTo(115,111,98,117);
    ctx.closePath();ctx.moveTo(134,86);ctx.lineTo(134,120);ctx.stroke();
    ctx.fillStyle=ink;ctx.font=`700 38px ${FONT}`;ctx.fillText('맘스북스',190,113);

  }
  function drawCover(ctx,cover,title,x,y,w,h,style) {
    ctx.save();ctx.shadowColor='#76574730';ctx.shadowBlur=24;ctx.shadowOffsetY=12;
    rounded(ctx,x,y,w,h,8,style.background);ctx.restore();
    if (cover) {
      const ratio=Math.min(w/cover.width,h/cover.height);
      const cw=cover.width*ratio,ch=cover.height*ratio;
      ctx.drawImage(cover,x+(w-cw)/2,y+(h-ch)/2,cw,ch);
    } else {
      ctx.fillStyle=style.ink;ctx.textAlign='center';ctx.font=`700 66px ${FONT}`;
      ctx.fillText([...title].slice(0,2).join(''),x+w/2,y+h/2);
      ctx.font=`22px ${FONT}`;ctx.fillText('BOOK JOURNAL',x+w/2,y+h-38);ctx.textAlign='left';
    }
  }
  function drawGarden(ctx,sheet,matureSheet,garden,y,style,decorations,decorationImages) {
    rounded(ctx,92,y,896,220,20,style.background);
    ctx.fillStyle=style.ink;ctx.font=`700 26px ${FONT}`;ctx.fillText('책과 함께 자라는 내 정원',120,y+44);
    ctx.font=`22px ${FONT}`;
    ctx.fillText(`완독 ${garden.count}권 · 다 자란 나무 ${garden.matureTrees.length}그루`,120,y+82);
    decorations.forEach((item,i) => {
      const x=800+i*80;
      if (decorationImages[i]) ctx.drawImage(decorationImages[i],x,y+8,60,60);
      ctx.font=`16px ${FONT}`;ctx.fillText(item.name,x-8,y+86);
    });
    const trees=[...garden.matureTrees,...(garden.currentTree ? [garden.currentTree] : [])];
    // Keep the snapshot readable even for a large library; total above remains exact.
    const visible=trees.slice(-6),size=110;
    visible.forEach((tree,i) => {
      const mature=tree.stage===5;
      const image=mature ? matureSheet : sheet;
      if (!image) return;
      const sw=image.width/3,sh=mature ? image.height : image.height/2;
      const column=mature ? ['forest','flower','fruit'].indexOf(tree.seed) : tree.stage%3;
      const row=mature ? 0 : Math.floor(tree.stage/3);
      // The growth sheet's second-row treetops cross the first-row boundary.
      const cellHeight=!mature && tree.stage<3 ? .94 : 1;
      ctx.drawImage(image,column*sw,row*sh,sw,sh*cellHeight,125+i*125,y+94,size,size*cellHeight);
    });
    if (!trees.length) {ctx.font=`22px ${FONT}`;ctx.fillText('책 한 권, 씨앗 하나에서 시작해요.',120,y+155);}
    else if (!sheet) {ctx.font=`22px ${FONT}`;ctx.fillText(garden.currentTree ? `지금 자라는 나무 · ${garden.currentCount}/20권` : '다음 씨앗을 기다리고 있어요.',120,y+155);}
    if (trees.length>6) {ctx.textAlign='right';ctx.font=`18px ${FONT}`;ctx.fillText('최근 나무 6그루',960,y+200);ctx.textAlign='left';}
  }
  function drawScrapbook(book, review, rating, art, cover, style) {
    const canvas=document.createElement('canvas');canvas.width=1080;
    const ctx=canvas.getContext('2d');
    ctx.font=`700 40px ${FONT}`;const titles=wrap(ctx,book.title || '제목 없음',760);
    ctx.font=`36px ${HAND}`;const lines=wrap(ctx,review || '오늘 아이랑 함께 읽은 책. 오래 기억하고 싶은 한 장면.',720);
    const noteY=700+titles.length*52;
    canvas.height=Math.max(1350,noteY+lines.length*48+170);
    if(canvas.height>8000)throw new Error('기록이 길어 이미지 한 장에 담기 어려워요.');
    ctx.fillStyle=style.paper;ctx.fillRect(0,0,1080,canvas.height);
    if(art)ctx.drawImage(art,0,0,1080,canvas.height);
    ctx.textAlign='center';ctx.fillStyle=style.ink;ctx.font=`30px ${HAND}`;
    ctx.fillText('오늘 아이랑 읽은 책',540,150);
    drawCover(ctx,cover,book.title || '책',380,200,320,400,style);
    ctx.textAlign='center';ctx.fillStyle=style.ink;ctx.font=`700 40px ${FONT}`;
    titles.forEach((line,i)=>ctx.fillText(line,540,660+i*52));
    ctx.textAlign='left';ctx.fillStyle='#614650';ctx.font=`36px ${HAND}`;
    lines.forEach((line,i)=>ctx.fillText(line,180,noteY+i*48));
    const score=Math.max(0,Math.min(5,Math.round(Number(rating)||0)));
    if(score){ctx.textAlign='center';ctx.fillStyle=style.ink;ctx.font=`24px ${FONT}`;ctx.fillText('★'.repeat(score),540,canvas.height-155);}
    rounded(ctx,300,canvas.height-90,480,68,16,'#fff8f0');
    ctx.textAlign='left';ctx.save();ctx.translate(285,canvas.height-135);ctx.scale(.8,.8);wordmark(ctx,style.ink);ctx.restore();
    return canvas;
  }
  async function generateInstagramTemplate(book, review, rating, templateId = 1) {
    if (document.fonts?.load) await Promise.all([document.fonts.load(`44px ${HAND}`),document.fonts.load(`36px ${FONT}`)]);
    if (document.fonts?.ready) await document.fonts.ready;
    const style=TEMPLATES[templateId] || TEMPLATES[1];
    const garden=style.garden ? window.ReadingGarden?.getGarden() || {count:0,matureTrees:[],currentTree:null,currentCount:0} : null;
    const decorations=style.garden ? window.ReadingGarden?.getCollection?.().equipped || [] : [];
    const [art,cover,sheet,matureSheet,...decorationImages]=await Promise.all([
      loadImage(style.art),loadImage(book.cover),
      style.garden ? loadImage('img/garden/growth-sprites.png') : null,
      style.garden ? loadImage('img/garden/mature-trees.png') : null,
      ...decorations.map(item=>loadImage('data:image/svg+xml;charset=utf-8,'+encodeURIComponent(item.svg)))
    ]);
    if(style.scrapbook)return drawScrapbook(book,review,rating,art,cover,style);
    const canvas=document.createElement('canvas');canvas.width=1080;
    const ctx=canvas.getContext('2d');
    const title=String(book.title || '제목 없음');
    ctx.font=`700 42px ${FONT}`;const titles=wrap(ctx,title,500);
    ctx.font=`25px ${FONT}`;const authors=wrap(ctx,book.author || (book.authors || []).join(', ') || '',500);
    ctx.font=`44px ${HAND}`;const reviews=wrap(ctx,review || '책을 덮고, 잠시 마음에 담아 둡니다.',740);
    const titleY=220,authorY=titleY+titles.length*56+12;
    const ratingY=authorY+authors.length*36+24;
    const reviewY=Math.max(460,ratingY+76);
    const reviewBottom=reviewY+(reviews.length-1)*54;
    const gardenY=reviewBottom+54;
    const contentBottom=style.garden ? gardenY+220 : reviewBottom+60;
    const height=Math.max(1350,contentBottom+130);
    if (height>8000) throw new Error('기록이 길어 이미지 한 장에 담기 어려워요. 통계에서 PDF로 저장해 주세요.');
    canvas.height=height;
    ctx.fillStyle=style.background;ctx.fillRect(0,0,1080,height);
    if (art) {
      // Retain the photographed props at their original proportions. Long notes extend the paper, not the objects.
      if (height===1350) ctx.drawImage(art,0,0,art.width,art.height,0,0,1080,1350);
      else {
        ctx.drawImage(art,0,0,art.width,art.height*.5,0,0,1080,675);
        ctx.drawImage(art,0,art.height*.5,art.width,art.height*.5,0,height-675,1080,675);
        rounded(ctx,96,530,888,height-1060,0,style.paper);
      }
    } else rounded(ctx,78,55,924,height-110,14,style.paper);
    // A light paper wash preserves readability if generated artwork has subtle texture.
    if (style.garden) { ctx.save();ctx.globalAlpha=.94;rounded(ctx,112,150,856,contentBottom-120,4,style.paper);ctx.restore(); }
    if (style.child) {
      ctx.fillStyle=style.ink;ctx.font=`28px ${HAND}`;ctx.fillText('오늘 아이랑 읽은 책',405,168);
    }
    drawCover(ctx,cover,title,180,190,190,236,style);
    ctx.fillStyle=style.ink;ctx.font=`700 42px ${FONT}`;
    titles.forEach((line,i)=>ctx.fillText(line,405,titleY+i*56));
    ctx.fillStyle='#826e73';ctx.font=`25px ${FONT}`;
    authors.forEach((line,i)=>ctx.fillText(line,405,authorY+i*36));
    const score=Math.max(0,Math.min(5,Number(rating)||0));
    ctx.fillStyle=style.ink;ctx.font=`26px ${FONT}`;
    ctx.fillText(score ? '★'.repeat(Math.round(score))+'☆'.repeat(5-Math.round(score)) : '☆☆☆☆☆',405,ratingY);
    ctx.fillStyle='#57444d';ctx.font=`44px ${HAND}`;
    reviews.forEach((line,i)=>ctx.fillText(line,180,reviewY+i*54));
    if (style.garden) {
      drawGarden(ctx,sheet,matureSheet,garden,gardenY,style,decorations,decorationImages);
    }
    ctx.save();ctx.translate(285,height-130);ctx.scale(.8,.8);wordmark(ctx,style.footerInk || style.ink);ctx.restore();
    return canvas;
  }
  function canvasBlob(canvas) {
    return new Promise((resolve,reject) => {
      try { canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('이미지를 만들지 못했어요.')), 'image/png'); }
      catch (_) { reject(new Error('이미지 저장을 완료하지 못했어요.')); }
    });
  }
  const preparedBlobs = new WeakMap();
  async function prepareShareCanvas(canvas) {
    const blob = await canvasBlob(canvas);
    preparedBlobs.set(canvas, blob);
    return canvas;
  }
  async function downloadCanvas(canvas, filename) {
    const blob = preparedBlobs.get(canvas) || await canvasBlob(canvas); const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href=url; link.download=filename; document.body.appendChild(link);link.click();link.remove();
    setTimeout(() => URL.revokeObjectURL(url),1000);
  }
  async function shareToAll(canvas, filename, bookTitle) {
    // Prepared previews reach navigator.share synchronously within the user's click.
    const blob = preparedBlobs.get(canvas) || await canvasBlob(canvas);
    const file = new File([blob],filename,{type:'image/png'});
    if (!navigator.share || !navigator.canShare?.({files:[file]})) return {success:false};
    try { await navigator.share({files:[file],title:bookTitle});return {success:true}; }
    catch (error) { if(error.name==='AbortError')return {success:false,cancelled:true};throw error; }
  }
  async function saveForApp(canvas, filename) {
    await downloadCanvas(canvas,filename);
    return {success:true,message:'이미지 저장을 시작했어요. 저장한 뒤 원하는 앱에서 공유해 주세요.'};
  }
  Object.assign(window,{generateInstagramTemplate,prepareShareCanvas,downloadCanvas,shareToAll,shareToInstagram:saveForApp,shareToKakao:saveForApp,shareToFacebook:saveForApp,shareToTwitter:saveForApp,INSTAGRAM_TEMPLATES:TEMPLATES});
})();
