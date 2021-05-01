const http = require('http');
const fs = require('fs');
const xml2js = require('xml2js')
const port = 80;

// 요약기능....
var book_list=[];
fs.readdir('./epub',(err,file_list)=>{book_list = file_list;})


const server = http.createServer(function(req,res){
    const url = req.url;
    const url_arr = req.url.split('/')
    const referer = req.headers.referer;
    //if (!url.includes('.png'))
    console.log('[request]', url,'[referer]',req.headers.referer)
    
    function ok(xx){
    var a = ["\\",'"', "'", '<', '>', '?', '|', '*', '..', '%'];
    for (var i=0; i<a.length; i++) if (xx.includes(a[i])) return false;
    return true;
    }

    function fs_readfile(res, url, encode, file_type, callback){
        //console.log('fs_readfile', url)
        var name = url.split('/').reverse()[0]
        var url_arr = url.split('/');
        if ( name.includes('.xhtml') || name.includes('.html')) encode='utf-8';
        
        fs.readFile(url, encode, (err,data)=>{
            if(err){ 
                console.error('[error] fs_readfile', err, url, encode, file_type)
                res.writeHead(404, {'Content-Type':'text/html; charset=utf-8'});
                res.end('Page Not Found');
            }else{
                if (url_arr[1]=='epub'){
                    var book_name = url_arr[2];
                    //console.log(encode, name);
                    if (encode=='utf-8' &&( name.includes('.xhtml') || name.includes('.html'))){
                        //console.log('xthml', referer)
                        if (referer&&referer.includes('/main')) {
                            //console.log('주소를 강제변환...');
                            data = 
                                data.replace(/href="..\//g,'href="')
                                .replace(/href="/g, `href="book/${encodeURIComponent(book_name)}/files/`)
                                .replace(/src="..\//g,'src="')
                                .replace(/src="/g, `src="book/${encodeURIComponent(book_name)}/files/`)
                        }
                        //link href="../styles/styles.css" rel
                        file_type='application/xhtml+xml';
                    } 
                }
                
                res.writeHead(200, {'Content-Type':file_type});
                res.end(data)
            }
        })
    callback();
    }

    function _404(res, url, err){
        console.error('_404 fn err', url, err)
        res.writeHead(404, {'Content-Type':'text/html; charset=utf-8'});
        res.end('Page Not Found');
    }
    
    
    if(url=='/'){
        res.writeHead(200, {'Content-Type':'text/html; charset=utf-8', 'Content-Location': '/main'});
        res.end('<meta http-equiv="refresh" content="0; url=/main" />');
    } 
    
    else if (url=='/main') fs_readfile(res, 'asset/index.html', 'utf-8', 'text/html; charset=utf-8', ()=>{})
    
    else if (url=='/get.js') fs_readfile(res, 'asset/get.js', 'utf-8', 'text/JavaScript; charset=utf-8', ()=>{})
    
    else if (url=='/list'){
        fs.readdir('./epub',(err,file_list)=>{
            book_list = file_list;
            if(err){
                res.writeHead(500, {'Content-Type':'text/html; charset=utf-8'});
                res.end('epub 디렉토리가 비었음!');
            }else{
                res.writeHead(200, {'Content-Type':'text/html; charset=utf-8'} );//, 'Content-Length': 데이터.length.toString()
                res .end(file_list.toString());
            }
        });
    }
    
    else if (url_arr[1]=='book'){
        var book_name = book_name = decodeURIComponent(url_arr[2]);
        //console.log('책 이름',book_name);
        if(!book_list.includes(book_name)) _404(res, url, [book_name, book_list, book_list.includes(book_name)]);
        
        if (url_arr[3]=='opf'){
            fs.readFile(`./epub/${book_name}/META-INF/container.xml`,'utf-8',(err,data)=>{
                xml2js.parseString(data, (err,result)=>{
                    var opf_path = result.container.rootfiles[0].rootfile[0].$['full-path'];
                    fs.readFile(`./epub/${book_name}/${opf_path}`, 'utf-8', (err,data)=>{
                        //console.log('opf, read',`./epub/${book_name}/OEBPS/content.opf`, err, data)
                        xml2js.parseString(data, (err,result)=>{
                            //console.log(result)
                            res.writeHead(200, {'Content-Type':'application/json; charset=utf-8'});
                            res.end(JSON.stringify(result))
                        });
                    });
                });
            });
            
        }else if (url_arr[3]=='files'){
            var file_url = url_arr.slice(4).join('/');
            if (!ok(file_url)) _404(res,url, "금지된 문자가 포함된 주소임.")
            //console.log('files', file_url);
            fs_readfile(res, `./epub/${book_name}/OEBPS/${file_url}`, null, 'application', ()=>{})
        }
        else if (url_arr[3]=='nav') fs_readfile(res, `./epub/${book_name}/OEBPS/nav.xhtml`, 'utf-8', 'text/html; charset=utf-8', ()=>{})
        else if (url_arr[3]=='style') fs_readfile(res, `./epub/${book_name}/OEBPS/styles/styles.css`, 'utf-8', 'text/css; charset=utf-8', ()=>{})
        else if (url_arr[3]=='xhtml') fs_readfile(res, `./epub/${book_name}/OEBPS/html/page${url_arr[5]}.xhtml`, 'utf-8', 'text/css; charset=utf-8', ()=>{})
        else if (url_arr[3]=='img') fs_readfile(res, `./epub/${book_name}/OEBPS/images/page${url_arr[5]}.jpg`, null, 'text/css; charset=utf-8', ()=>{})
    }    
    
    else _404(res,url, 'Page Not Found, else;');
});

server.listen(port, ()=>{
    console.log(`Server is running at localhost:${port}`);
});