const max = (a,b)=>a>b?a:b;
var reader = {
    onload:()=>{
        //console.log('reader onload function')
        reader.list_div= document.getElementById('choose_in');
        reader.contents_nav = document.getElementById('contents_nav')
        reader.contents_nav_in = document.getElementById('contents_nav_in')
        reader.pages = document.getElementById('pages');
        reader.contents.hidden_btn=document.getElementById('contents_hidden');
        reader.pre_page = document.getElementById('pre_page')
        reader.get_list();
        reader.contents_nav.style.height = reader.contents_nav_in.style.height = `${screen.height}px`;
        reader.pages.addEventListener('scroll',reader.frame.show_pages)
        reader.pages.addEventListener('mouseenter',(e)=>{reader.contents.mouseout_fn(e)});
    },
    get_list:()=>{
        fetch('./list').then((data)=>{
            return data.text()
        }).then((data)=>{
            reader.list_div.innerHTML = '';
            (reader.book_list = data.split(','))
            .forEach((v)=>{
                reader.list_div.innerHTML += `<li onclick="reader.set_book(this.innerHTML)">${v}</li>`
            })
        })
    },
    get_book_opf:(name,callback)=>{
        
        reader.book_name = name;
        fetch(`/book/${name}/opf`).then((res)=>{return res.json()}).then((d)=>{
            console.log('data',d)
            reader.title = document.title = d.package.metadata[0]["dc:title"][0]._
            reader.creator = d.package.metadata[0]["dc:creator"][0]._
            reader.publisher = d.package.metadata[0]["dc:publisher"][0]._
            //reader.page = Number (d.package.metadata[0]["dc:format"][0].split(' ')[0])
            reader.asset={};
            d.package.manifest[0].item.forEach((v) => {
                var url = v.$.href;
                reader.asset[url.split('/')[0]] ? reader.asset[url.split('/')[0]].push(url) : reader.asset[url.split('/')[0]] = [url]
            })
            callback(d)})
    },
    get_book_nav:(name,callback)=>{
        fetch(`/book/${name}/nav`).then((res)=>{return res.text()}).then((data)=>{callback(data)})
    },
    get_book_style:(name,callback)=>{
        fetch(`/book/${name}/style`).then((res)=>{return res.blob()}).then((data)=>{callback(data)})
    },
    get_book_page_xhtml:(name,page,callback)=>{
         fetch(`/book/${name}/files/${page}`).then((res)=>{return res.text()}).then((data)=>{callback(data)})
    },
    /*get_book_page_img:(name,imgname,callback)=>{
         fetch(`/book/${name}/img/${imgname}`).then((res)=>{return res.blob()}).then((data)=>{callback(URL.createObjectURL(data))})
    },*/
    asset:{},
    book_list:[],
    book_name:'',
    set_book:(name)=>{
        reader.frame.reset();
        
        reader.get_book_opf(name,(data)=>{
            //console.log((data))
            reader.get_book_nav(name, (data)=>{
                reader.contents_nav_in.innerHTML = data
                
                // 차례 만드는 부분.
                var oParser = new DOMParser();
                var oDOM = oParser.parseFromString(data, "text/xml");
                [...oDOM.querySelectorAll('nav')].forEach((v)=>{
                    if(v.attributes['epub:type'].value!='page-list') return;
                    var tmp = v.querySelectorAll('li>a');
                    reader.page_list = []//new Array(tmp.length);
                    //reader.out_html = new Array(tmp.length);
                    for (var i=0; i< tmp.length; i++){
                        var arr = tmp[i].href.split('/');
                        var src = arr.slice(arr.length-2).join('/').split('#')[0];
                        if(!reader.page_list.includes(src)) reader.page_list.push(src);
                    }
                    
                    //페이지수에 관한 부분..
                    reader.page_lenngth = reader.page_list.length;
                    var out=''
                    for (var i=0; i<reader.page_lenngth; i++) out+= `<div class='pages page_${i}' page="${i}">_</div>`;
                    reader.pages.innerHTML = out;
                    reader.frame.loading = new Array(reader.page_lenngth).fill(false);
                    
                    // 차례를 바탕으로 링크 재설정.
                    reader.contents_nav_in.querySelectorAll('a').forEach((v)=>{
                        var url = reader.frame.get_page_url(v.href);
                        v.href = `javascript:reader.frame.change_page("${url}")`;
                        });
                    reader.frame.show_pages();
                });
            });
        });
    },
    contents:{
        hidden: false,
        hidden_fn:()=>{
            reader.contents_nav_in.style.display=reader.contents.hidden?'block':'none';
            reader.contents_nav.style.backgroundColor=reader.contents.hidden?'white':'rgba(0,0,0,0)';
            reader.contents_nav_in.style.overflow=reader.contents.hidden?'scroll':'auto';
            reader.contents_nav.style.height = reader.contents_nav_in.style.height=reader.contents.hidden?`${screen.height}px`:'60px';
            reader.contents.hidden=!reader.contents.hidden
                
        },mouseout_fn:(e)=>{
            if(!e) return;  
            if (!reader.contents.hidden) reader.contents.hidden_fn();
        }
    },
    frame:{
        get_pages:(ind, callback)=>{
            reader.get_book_page_xhtml(reader.book_name, reader.page_list[ind],(data)=>{
                /*function xml2str(df){
                    out=''
                    k = function (ele) {
                    out += `<${ele.nodeName} `;
                    [...ele.attributes].forEach((v) => { out += `${v.name}="${v.value}" `})
                        out += '>';
                        var ch = ele.childNodes;
                        for (var i = 0; i < ch.length; i++) (ch[i].nodeName == "#text") ? out += ch[i].data : k(ch[i]);
                        out += `</${ele.nodeName}>`;
                    }
                    k(df.childNodes[0]);
                    return out;
                }*/
                df = new DOMParser().parseFromString(data, 'application/xhtml+xml') // xhtml과 html의 형식이 약간 다름... 
                df.querySelectorAll('a').forEach((v)=>{
                    var url = reader.frame.get_page_url(v.href);
                     if (!reader.page_list.includes(url.split('#')[0]))
                         for(var i=0; i<reader.page_list.length; i++)
                             if(reader.page_list[i].includes(url.split('/')[1])){
                                url =  reader.page_list[i];
                                break;
                            }
                    v.href = `javascript:reader.frame.change_page("${url}")`;
                })
                
                callback(ind, new XMLSerializer().serializeToString(df));
            })
        },
        loading:[],
        showing:true,
        show_pages:()=>{
            if (!reader.frame.showing) return;
            reader.frame.showing = false;
            //console.log('show_pages')
            var cli_h=reader.pages.clientHeight;
            var scl_top = reader.pages.scrollTop;
            
            for (var i=0; i<reader.page_lenngth; i++){
                if(!reader.pages.children.length) break;
                //console.log(reader.pages.children, reader.pages)
                var div_top = reader.pages.children[i].offsetTop;
                var div_h = reader.pages.children[i].clientHeight;
                
                //console.log(cli_h, scl_top, i, div_top)
                if (scl_top > (div_h+div_top)){ // 보이는 것보다 위쪽
                    reader.pages.children[i].innerHTML='_'
                }
                else if ((scl_top+cli_h) >= div_top) { // 화면에 보임.
                    reader.pre_page.innerHTML = i;
                    if (reader.frame.loading[i] || reader.pages.children[i].innerHTML!='_') continue;
                    reader.frame.loading[i]=true;
                    //console.log('show_pages load',i)
                    reader.frame.get_pages(i,(ind, data)=>{
                        reader.pages.children[ind].innerHTML=`<div class='pages_in ' page="${ind}'>${data}</div>`;
                        console.log('fn show_pages:: page load',ind)
                        if(reader.pages.children[ind].children[0])
                            reader.pages.children[ind].style.height= `${reader.pages.children[ind].children[0].scrollHeight}px`
                            reader.frame.loading[ind] = false;
                    })
                }else break;
            }
             reader.frame.showing = true;
            //location.hash = location.hash;
        },
        reset:()=>{
            reader.pages.innerHTML='';
            reader.frame.showing=true
            reader.frame.loading=[]
        },
        change_page:(url)=>{
            var page, hash;
            [page, hash]= url.split('#');
            var ind = reader.page_list.indexOf(page)
            var my_height = document.getElementsByClassName(`page_${ind}`)[0].offsetTop;
            reader.pages.scrollTop = my_height;
            reader.frame.show_pages();
            if(hash) location.hash=hash;
        },
        get_page_url:(url)=>{
            var arr = url.split('/');
            var src = arr.slice(arr.length-2).join('/')
            //var ind = reader.page_list.indexOf(src);
            
            return src;
        }
    }
}