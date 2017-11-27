// ==UserScript==
// @name         百度网盘直接下载助手
// @namespace    undefined
// @version      0.9.24
// @description  直接下载百度网盘和百度网盘分享的文件,避免下载文件时调用百度网盘客户端,获取网盘文件的直接下载地址
// @author       ivesjay
// @match        *://pan.baidu.com/disk/home*
// @match        *://yun.baidu.com/disk/home*
// @match        *://pan.baidu.com/s/*
// @match        *://yun.baidu.com/s/*
// @match        *://pan.baidu.com/share/link*
// @match        *://yun.baidu.com/share/link*
// @require      https://code.jquery.com/jquery-latest.js
// @run-at       document-start
// @grant        unsafeWindow
// @grant        GM_setClipboard
// ==/UserScript==

(function() {
    'use strict';

    var $ = $ || window.$;
    var log_count = 1;
    var wordMapHttp = {
        'list-grid-switch':'yvgb9XJ',
        'list-switched-on':'ksbXZm',
        'grid-switched-on':'tch6W25',
        'list-switch':'lrbo9a',
        'grid-switch':'xh6poL',
        'checkbox':'EOGexf',
        'col-item':'Qxyfvg',
        'check':'fydGNC',
        'checked':'EzubGg',
        'list-view':'vdAfKMb',
        'item-active':'ngb9O6',
        'grid-view':'JKvHJMb',
        'bar-search':'OFaPaO',
        'default-dom':'xpX2PV',
        'bar':'qxnX2G5',
        'list-tools':'QDDOQB'
    };
    var wordMapHttps = {
        'list-grid-switch':'qobmXB1q',
        'list-switched-on':'ewXm1e',
        'grid-switched-on':'kxhkX2Em',
        'list-switch':'rvpXm63',
        'grid-switch':'mxgdJgwv',
        'checkbox':'EOGexf',
        'col-item':'Qxyfvg',
        'check':'fydGNC',
        'checked':'EzubGg',
        'list-view':'vdAfKMb',
        'item-active':'pcamXBRX',
        'grid-view':'JKvHJMb',
        'bar-search':'OFaPaO',
        'default-dom':'nyztJqWE',
        'bar':'mkseJqKQ',
        'list-tools':'QDDOQB'
    };
    var wordMap = location.protocol == 'http:' ? wordMapHttp : wordMapHttps;
    
    //console.log(wordMap);

    function slog(c1,c2,c3){
        c1 = c1?c1:'';
        c2 = c2?c2:'';
        c3 = c3?c3:'';
        console.log('#'+ log_count++ +'-BaiDuNetdiskHelper-log:',c1,c2,c3);
    }

    $(function(){
        switch(detectPage()){
            case 'disk':
                var panHelper = new PanHelper();
                panHelper.init();
                return;
            case 'share':
            case 's':
                var panShareHelper = new PanShareHelper();
                panShareHelper.init();
                return;
            default:
                return;
        }
    });

    //网盘页面的下载助手
    function PanHelper(){
        var yunData,sign,timestamp,bdstoken,logid,fid_list;
        var fileList=[],selectFileList=[],batchLinkList=[],batchLinkListAll=[],linkList=[],
            list_grid_status='list';
        var observer,currentPage,currentPath,currentCategory,dialog,searchKey;
        var panAPIUrl = location.protocol + "//" + location.host + "/api/";
        var restAPIUrl = location.protocol + "//pcs.baidu.com/rest/2.0/pcs/";
        var clientAPIUrl = location.protocol + "//d.pcs.baidu.com/rest/2.0/pcs/";

        this.init = function(){
            yunData = unsafeWindow.yunData;
            slog('yunData:',yunData);
            if(yunData === undefined){
                slog('页面未正常加载，或者百度已经更新！');
                return;
            }
            initParams();
            registerEventListener();
            createObserver();
            addButton();
            createIframe();
            dialog = new Dialog({addCopy:true});

            slog('网盘直接下载助手加载成功！');
        };

        function initParams(){
            sign = getSign();
            timestamp = getTimestamp();
            bdstoken = getBDStoken();
            logid = getLogID();
            currentPage = getCurrentPage();
            slog('Current display mode:',currentPage);

            if(currentPage == 'list')
                currentPath = getPath();

            if(currentPage == 'category')
                currentCategory = getCategory();

            if(currentPage == 'search')
                searchKey = getSearchKey();

            refreshListGridStatus();
            refreshFileList();
            refreshSelectList();
        }

        function refreshFileList(){
            if (currentPage == 'list') {
                fileList = getFileList();
            } else if (currentPage == 'category'){
                fileList = getCategoryFileList();
            } else if (currentPage == 'search') {
                fileList = getSearchFileList();
            }
        }

        function refreshSelectList(){
            selectFileList = [];
        }

        function refreshListGridStatus(){
            list_grid_status = getListGridStatus();
        }

        //获取当前的视图模式
        function getListGridStatus(){
            //return $('div.list-grid-switch').hasClass('list-switched-on')?'list':($('div.list-grid-switch').hasClass('grid-switched-on')?'grid':'list');
            //return $('div.itiWzPY').hasClass('kudtWY46')?'list':($('div.itiWzPY').hasClass('nytAL9w')?'grid':'list');
            return $('div.'+wordMap['list-grid-switch']).hasClass(wordMap['list-switched-on'])?'list':($('div.'+wordMap['list-grid-switch']).hasClass(wordMap['grid-switched-on'])?'grid':'list');
        }

        function registerEventListener(){
            registerHashChange();
            registerListGridStatus();
            registerCheckbox();
            registerAllCheckbox();
            registerFileSelect();
        }

        //监视地址栏#标签的变化
        function registerHashChange(){
            window.addEventListener('hashchange',function(e){
                refreshListGridStatus();
                if(getCurrentPage() == 'list') {
                    if(currentPage == getCurrentPage()){
                        if(currentPath == getPath()){
                            return;
                        } else {
                            currentPath = getPath();
                            refreshFileList();
                            refreshSelectList();
                        }
                    } else {
                        currentPage = getCurrentPage();
                        currentPath = getPath();
                        refreshFileList();
                        refreshSelectList();
                    }
                } else if (getCurrentPage() == 'category') {
                    if(currentPage == getCurrentPage()){
                        if(currentCategory == getCategory()){
                            return;
                        } else {
                            currentPage = getCurrentPage();
                            currentCategory = getCategory();
                            refreshFileList();
                            refreshSelectList();
                        }
                    } else {
                        currentPage = getCurrentPage();
                        currentCategory = getCategory();
                        refreshFileList();
                        refreshSelectList();
                    }
                } else if(getCurrentPage() == 'search') {
                    if(currentPage == getCurrentPage()){
                        if(searchKey == getSearchKey()){
                            return;
                        } else {
                            currentPage = getCurrentPage();
                            searchKey = getSearchKey();
                            refreshFileList();
                            refreshSelectList();
                        }
                    } else {
                        currentPage = getCurrentPage();
                        searchKey = getSearchKey();
                        refreshFileList();
                        refreshSelectList();
                    }
                }
            });
        }

        //监视视图变化
        function registerListGridStatus(){
            //var $a_list = $('a[node-type=list-switch]');
            //var $a_list = $('a[node-type=eepWzkk]');
            var $a_list = $('a[node-type='+wordMap['list-switch']+']');
            $a_list.click(function(){
                list_grid_status = 'list';
            });

            //var $a_grid = $('a[node-type=grid-switch]');
            //var $a_grid = $('a[node-type=ytnvWY7q]');
            var $a_grid = $('a[node-type='+wordMap['grid-switch']+']');
            $a_grid.click(function(){
                list_grid_status = 'grid';
            });
        }

        //文件选择框
        function registerCheckbox(){
            //var $checkbox = $('span.checkbox');
            //var $checkbox = $('span.EOGexf');
            var $checkbox = $('span.'+wordMap['checkbox']);
            $checkbox.each(function(index,element){
                $(element).bind('click',function(e){
                    var $parent = $(this).parent();
                    var filename;
                    if(list_grid_status == 'list') {
                        //filename = $('div.file-name div.text a',$parent).attr('title');
                        filename = $('div.file-name div.text a',$parent).attr('title');
                    }else if(list_grid_status == 'grid'){
                        //filename = $('div.file-name a',$parent).attr('title');
                        filename = $('div.file-name a',$parent).attr('title');
                    }
                    //if($parent.hasClass('item-active')){
                    //if($parent.hasClass('prWzXA')){
                    if($parent.hasClass(wordMap['item-active'])){
                        slog('取消选中文件：'+filename);
                        for(var i=0;i<selectFileList.length;i++){
                            if(selectFileList[i].filename == filename){
                                selectFileList.splice(i,1);
                            }
                        }
                    }else{
                        slog('选中文件:'+filename);
                        $.each(fileList,function(index,element){
                            if(element.server_filename == filename){
                                var obj = {
                                    filename:element.server_filename,
                                    path:element.path,
                                    fs_id:element.fs_id,
                                    isdir:element.isdir
                                };
                                selectFileList.push(obj);
                            }
                        });
                    }
                });
            });
        }

        function unregisterCheckbox(){
            //var $checkbox = $('span.checkbox');
            //var $checkbox = $('span.EOGexf');
            var $checkbox = $('span.'+wordMap['checkbox']);
            $checkbox.each(function(index,element){
                $(element).unbind('click');
            });
        }

        //全选框
        function registerAllCheckbox(){
            //var $checkbox = $('div.col-item.check');
            //var $checkbox = $('div.Qxyfvg.fydGNC');
            var $checkbox = $('div.'+wordMap['col-item']+'.'+wordMap['check']);
            $checkbox.each(function(index,element){
                $(element).bind('click',function(e){
                    var $parent = $(this).parent();
                    //if($parent.hasClass('checked')){
                    //if($parent.hasClass('EzubGg')){
                    if($parent.hasClass(wordMap['checked'])){
                        slog('取消全选');
                        selectFileList = [];
                    } else {
                        slog('全部选中');
                        selectFileList = [];
                        $.each(fileList,function(index,element){
                            var obj = {
                                filename:element.server_filename,
                                path:element.path,
                                fs_id:element.fs_id,
                                isdir:element.isdir
                            };
                            selectFileList.push(obj);
                        });
                    }
                });
            });
        }

        function unregisterAllCheckbox(){
            //var $checkbox = $('div.col-item.check');
            //var $checkbox = $('div.Qxyfvg.fydGNC');
            var $checkbox = $('div.'+wordMap['col-item']+'.'+wordMap['check']);
            $checkbox.each(function(index,element){
                $(element).unbind('click');
            });
        }

        //单个文件选中，点击文件不是点击选中框，会只选中该文件
        function registerFileSelect(){
            //var $dd = $('div.list-view dd');
            //var $dd = $('div.vdAfKMb dd');
            var $dd = $('div.'+wordMap['list-view']+' dd');
            $dd.each(function(index,element){
                $(element).bind('click',function(e){
                    var nodeName = e.target.nodeName.toLowerCase();
                    if(nodeName != 'span' && nodeName != 'a' && nodeName != 'em') {
                        slog('shiftKey:'+e.shiftKey);
                        if(!e.shiftKey){
                            selectFileList = [];
                            var filename = $('div.file-name div.text a',$(this)).attr('title');
                            slog('选中文件：' + filename);
                            $.each(fileList,function(index,element){
                                if(element.server_filename == filename){
                                    var obj = {
                                        filename:element.server_filename,
                                        path:element.path,
                                        fs_id:element.fs_id,
                                        isdir:element.isdir
                                    };
                                    selectFileList.push(obj);
                                }
                            });
                        }else{
                            selectFileList = [];
                            //var $dd_select = $('div.list-view dd.item-active');
                            //var $dd_select = $('div.vdAfKMb dd.prWzXA');
                            var $dd_select = $('div.'+wordMap['list-view']+' dd.'+wordMap['item-active']);
                            $.each($dd_select,function(index,element){
                                var filename = $('div.file-name div.text a',$(element)).attr('title');
                                slog('选中文件：' + filename);
                                $.each(fileList,function(index,element){
                                    if(element.server_filename == filename){
                                        var obj = {
                                            filename:element.server_filename,
                                            path:element.path,
                                            fs_id:element.fs_id,
                                            isdir:element.isdir
                                        };
                                        selectFileList.push(obj);
                                    }
                                });
                            });
                        }
                    }
                });
            });
        }

        function unregisterFileSelect(){
            //var $dd = $('div.list-view dd');
            //var $dd = $('div.vdAfKMb dd');
            var $dd = $('div.'+wordMap['list-view']+' dd');
            $dd.each(function(index,element){
                $(element).unbind('click');
            });
        }

        //监视文件列表显示变化
        function createObserver(){
            var MutationObserver = window.MutationObserver;
            var options = {
                'childList': true
            };
            observer = new MutationObserver(function(mutations){
                unregisterCheckbox();
                unregisterAllCheckbox();
                unregisterFileSelect();
                registerCheckbox();
                registerAllCheckbox();
                registerFileSelect();
            });
            
            //var list_view = document.querySelector('.list-view');
            //var grid_view = document.querySelector('.grid-view');
            
            //var list_view = document.querySelector('.vdAfKMb');
            //var grid_view = document.querySelector('.JKvHJMb');
            
            var list_view = document.querySelector('.'+wordMap['list-view']);
            var grid_view = document.querySelector('.'+wordMap['grid-view']);

            observer.observe(list_view,options);
            observer.observe(grid_view,options);
        }

        //添加助手按钮
        function addButton(){
            //$('div.bar-search').css('width','18%');//修改搜索框的宽度，避免遮挡
            //$('div.OFaPaO').css('width','18%');
            $('div.'+wordMap['bar-search']).css('width','18%');
            var $dropdownbutton = $('<span class="g-dropdown-button"></span>');
            var $dropdownbutton_a = $('<a class="g-button" href="javascript:void(0);"><span class="g-button-right"><em class="icon icon-download" title="百度网盘下载助手"></em><span class="text" style="width: auto;">下载助手</span></span></a>');
            var $dropdownbutton_span = $('<span class="menu" style="width:96px"></span>');

            var $directbutton = $('<span class="g-button-menu" style="display:block"></span>');
            var $directbutton_span = $('<span class="g-dropdown-button g-dropdown-button-second" menulevel="2"></span>');
            var $directbutton_a = $('<a class="g-button" href="javascript:void(0);"><span class="g-button-right"><span class="text" style="width:auto">直接下载</span></span></a>');
            var $directbutton_menu = $('<span class="menu" style="width:120px;left:79px"></span>');
            var $directbutton_download_button = $('<a id="download-direct" class="g-button-menu" href="javascript:void(0);">下载</a>');
            var $directbutton_link_button = $('<a id="link-direct" class="g-button-menu" href="javascript:void(0);">显示链接</a>');
            var $directbutton_batchhttplink_button = $('<a id="batchhttplink-direct" class="g-button-menu" href="javascript:void(0);">批量链接(HTTP)</a>');
            var $directbutton_batchhttpslink_button = $('<a id="batchhttpslink-direct" class="g-button-menu" href="javascript:void(0);">批量链接(HTTPS)</a>');
            $directbutton_menu.append($directbutton_download_button).append($directbutton_link_button).append($directbutton_batchhttplink_button).append($directbutton_batchhttpslink_button);
            $directbutton.append($directbutton_span.append($directbutton_a).append($directbutton_menu));
            $directbutton.hover(function(){
                $directbutton_span.toggleClass('button-open');
            });
            $directbutton_download_button.click(downloadClick);
            $directbutton_link_button.click(linkClick);
            $directbutton_batchhttplink_button.click(batchClick);
            $directbutton_batchhttpslink_button.click(batchClick);

            var $apibutton = $('<span class="g-button-menu" style="display:block"></span>');
            var $apibutton_span = $('<span class="g-dropdown-button g-dropdown-button-second" menulevel="2"></span>');
            var $apibutton_a = $('<a class="g-button" href="javascript:void(0);"><span class="g-button-right"><span class="text" style="width:auto">API下载</span></span></a>');
            var $apibutton_menu = $('<span class="menu" style="width:120px;left:77px"></span>');
            var $apibutton_download_button = $('<a id="download-api" class="g-button-menu" href="javascript:void(0);">下载</a>');
            var $apibutton_link_button = $('<a id="httplink-api" class="g-button-menu" href="javascript:void(0);">显示链接</a>');
            var $apibutton_batchhttplink_button = $('<a id="batchhttplink-api" class="g-button-menu" href="javascript:void(0);">批量链接(HTTP)</a>');
            var $apibutton_batchhttpslink_button = $('<a id="batchhttpslink-api" class="g-button-menu" href="javascript:void(0);">批量链接(HTTPS)</a>');
            $apibutton_menu.append($apibutton_download_button).append($apibutton_link_button).append($apibutton_batchhttplink_button).append($apibutton_batchhttpslink_button);
            $apibutton.append($apibutton_span.append($apibutton_a).append($apibutton_menu));
            $apibutton.hover(function(){
                $apibutton_span.toggleClass('button-open');
            });
            $apibutton_download_button.click(downloadClick);
            $apibutton_link_button.click(linkClick);
            $apibutton_batchhttplink_button.click(batchClick);
            $apibutton_batchhttpslink_button.click(batchClick);

            var $outerlinkbutton = $('<span class="g-button-menu" style="display:block"></span>');
            var $outerlinkbutton_span = $('<span class="g-dropdown-button g-dropdown-button-second" menulevel="2"></span>');
            var $outerlinkbutton_a = $('<a class="g-button" href="javascript:void(0);"><span class="g-button-right"><span class="text" style="width:auto">外链下载</span></span></a>');
            var $outerlinkbutton_menu = $('<span class="menu" style="width:120px;left:79px"></span>');
            var $outerlinkbutton_download_button = $('<a id="download-outerlink" class="g-button-menu" href="javascript:void(0);">下载</a>');
            var $outerlinkbutton_link_button = $('<a id="link-outerlink" class="g-button-menu" href="javascript:void(0);">显示链接</a>');
            var $outerlinkbutton_batchlink_button = $('<a id="batchlink-outerlink" class="g-button-menu" href="javascript:void(0);">批量链接</a>');
            $outerlinkbutton_menu.append($outerlinkbutton_download_button).append($outerlinkbutton_link_button).append($outerlinkbutton_batchlink_button);
            $outerlinkbutton.append($outerlinkbutton_span.append($outerlinkbutton_a).append($outerlinkbutton_menu));
            $outerlinkbutton.hover(function(){
                $outerlinkbutton_span.toggleClass('button-open');
            });
            $outerlinkbutton_download_button.click(downloadClick);
            $outerlinkbutton_link_button.click(linkClick);
            $outerlinkbutton_batchlink_button.click(batchClick);

            $dropdownbutton_span.append($directbutton).append($apibutton).append($outerlinkbutton);
            $dropdownbutton.append($dropdownbutton_a).append($dropdownbutton_span);

            $dropdownbutton.hover(function(){
                $dropdownbutton.toggleClass('button-open');
            });

            //$('div.default-dom div.bar div.list-tools').append($dropdownbutton);
            //$('div.irhW9pZ div.yqgR747 div.QDDOQB').append($dropdownbutton);
            $('div.'+wordMap['default-dom']+' div.'+wordMap['bar']+' div.'+wordMap['list-tools']).append($dropdownbutton);
        }

        //暂时没用
        // function addLoading(){
        //     var screenWidth = document.body.clientWidth;
        //     var screenHeight = document.body.scrollHeight;
        //     var left = (screenWidth-10)/2;
        //     var top = screenHeight/2;
        //     var $loading = $('<div id="dialog-loading" style="position:absolute;left:'+left+'px;top:'+top+'px;display:none;z-index:52;color:white;font-size:16px">处理中</div>');
        //     $('body').append($loading);
        // }

        function downloadClick(event){
            slog('选中文件列表：',selectFileList);
            var id = event.target.id;
            var downloadLink;

            if(id == 'download-direct'){
                var downloadType;
                if(selectFileList.length === 0) {
                    alert("获取选中文件失败，请刷新重试！");
                    return;
                } else if (selectFileList.length == 1) {
                    if (selectFileList[0].isdir === 1)
                        downloadType = 'batch';
                    else if (selectFileList[0].isdir === 0)
                        downloadType= 'dlink';
                    //downloadType = selectFileList[0].isdir==1?'batch':(selectFileList[0].isdir===0?'dlink':'batch');
                } else if(selectFileList.length > 1){
                    downloadType = 'batch';
                }
                fid_list = getFidList(selectFileList);
                var result = getDownloadLinkWithPanAPI(downloadType);
                if(result.errno === 0){
                    if(downloadType == 'dlink')
                        downloadLink = result.dlink[0].dlink;
                    else if(downloadType == 'batch'){
                        downloadLink = result.dlink;
                        if(selectFileList.length === 1)
                            downloadLink = downloadLink + '&zipname=' + encodeURIComponent(selectFileList[0].filename) + '.zip';
                    }
                    else{
                        alert("发生错误！");
                        return;
                    }
                } else if(result.errno == -1){
                    alert('文件不存在或已被百度和谐，无法下载！');
                    return;
                }else if(result.errno == 112){
                    alert("页面过期，请刷新重试！");
                    return;
                }else{
                    alert("发生错误！");
                    return;
                }
            }else{
                if(selectFileList.length === 0) {
                    alert("获取选中文件失败，请刷新重试！");
                    return;
                } else if (selectFileList.length > 1) {
                    alert("该方法不支持多文件下载！");
                    return;
                } else {
                    if(selectFileList[0].isdir == 1){
                        alert("该方法不支持目录下载！");
                        return;
                    }
                }
                if(id == 'download-api'){
                    downloadLink = getDownloadLinkWithRESTAPIBaidu(selectFileList[0].path);
                } else if (id == 'download-outerlink'){
                    var result = getDownloadLinkWithClientAPI(selectFileList[0].path);
                    if(result.errno == 0){
                        downloadLink = result.urls[0].url;
                    }else if(result.errno == 1){
                        alert('文件不存在！');
                        return;
                    }else if(result.errno == 2){
                        alert('文件不存在或者已被百度和谐，无法下载！');
                        return;
                    }else{
                        alert('发生错误！');
                        return;
                    }
                }
            }
            execDownload(downloadLink);
        }

        function linkClick(event){
            slog('选中文件列表：',selectFileList);
            var id = event.target.id;
            var linkList,tip;

            if(id.indexOf('direct') != -1){
                var downloadType;
                var downloadLink;
                if(selectFileList.length === 0) {
                    alert("获取选中文件失败，请刷新重试！");
                    return;
                } else if (selectFileList.length == 1) {
                    if (selectFileList[0].isdir === 1)
                        downloadType = 'batch';
                    else if (selectFileList[0].isdir === 0)
                        downloadType= 'dlink';
                } else if(selectFileList.length > 1){
                    downloadType = 'batch';
                }
                fid_list = getFidList(selectFileList);
                var result = getDownloadLinkWithPanAPI(downloadType);
                if(result.errno === 0){
                    if(downloadType == 'dlink')
                        downloadLink = result.dlink[0].dlink;
                    else if(downloadType == 'batch'){
                        slog(selectFileList);
                        downloadLink = result.dlink;
                        if(selectFileList.length === 1)
                            downloadLink = downloadLink + '&zipname=' + encodeURIComponent(selectFileList[0].filename) + '.zip';
                    }
                    else{
                        alert("发生错误！");
                        return;
                    }
                }else if(result.errno == -1){
                    alert('文件不存在或已被百度和谐，无法下载！');
                    return;
                }else if(result.errno == 112){
                    alert("页面过期，请刷新重试！");
                    return;
                }else{
                    alert("发生错误！");
                    return;
                }
                var httplink = downloadLink.replace(/^([A-Za-z]+):/,'http:');
                var httpslink = downloadLink.replace(/^([A-Za-z]+):/,'https:');
                var filename = '';
                $.each(selectFileList,function(index,element){
                    if(selectFileList.length == 1)
                        filename = element.filename;
                    else{
                        if(index ==0)
                            filename = element.filename;
                        else
                            filename = filename + ',' + element.filename;
                    }
                });
                linkList = {
                    filename:filename,
                    urls:[
                        {url:httplink,rank:1},
                        {url:httpslink,rank:2}
                    ]
                };
                tip = '显示模拟百度网盘网页获取的链接，可以使用右键迅雷下载，复制到下载工具需要传递cookie，多文件打包下载的链接可以直接复制使用';
                dialog.open({title:'下载链接',type:'link',list:linkList,tip:tip});
            }else{
                if(selectFileList.length === 0) {
                    alert("获取选中文件失败，请刷新重试！");
                    return;
                } else if (selectFileList.length > 1) {
                    alert("该方法不支持多文件下载！");
                    return;
                } else {
                    if(selectFileList[0].isdir == 1){
                        alert("该方法不支持目录下载！");
                        return;
                    }
                }
                if(id.indexOf('api') != -1){
                    var downloadLink = getDownloadLinkWithRESTAPIBaidu(selectFileList[0].path);
                    var httplink = downloadLink.replace(/^([A-Za-z]+):/,'http:');
                    var httpslink = downloadLink.replace(/^([A-Za-z]+):/,'https:');
                    linkList = {
                        filename:selectFileList[0].filename,
                        urls:[
                            {url:httplink,rank:1},
                            {url:httpslink,rank:2}
                        ]
                    };
                    httplink = httplink.replace('250528','266719');
                    httpslink = httpslink.replace('250528','266719');
                    linkList.urls.push({url:httplink,rank:3});
                    linkList.urls.push({url:httpslink,rank:4});
                    tip = '显示模拟APP获取的链接(使用百度云ID)，可以使用右键迅雷下载，复制到下载工具需要传递cookie';
                    dialog.open({title:'下载链接',type:'link',list:linkList,tip:tip});
                } else if (id.indexOf('outerlink') != -1){
                    var result = getDownloadLinkWithClientAPI(selectFileList[0].path);
                    if(result.errno == 0){
                        linkList = {
                            filename:selectFileList[0].filename,
                            urls:result.urls
                        };
                    }else if(result.errno == 1){
                        alert('文件不存在！');
                        return;
                    }else if(result.errno == 2){
                        alert('文件不存在或者已被百度和谐，无法下载！');
                        return;
                    }else{
                        alert('发生错误！');
                        return;
                    }
                    tip = '显示模拟百度网盘客户端获取的链接，可以直接复制到下载工具使用，不需要cookie';
                    dialog.open({title:'下载链接',type:'link',list:linkList,tip:tip,showcopy:true,showedit:true});
                }
            }
            //dialog.open({title:'下载链接',type:'link',list:linkList,tip:tip});
        }

        function batchClick(event){
            slog('选中文件列表：',selectFileList);
            if(selectFileList.length === 0){
                alert('获取选中文件失败，请刷新重试！');
                return;
            }
            var id = event.target.id;
            var linkType,tip;
            linkType = id.indexOf('https') == -1 ? (id.indexOf('http') == -1 ? location.protocol+':' : 'http:') : 'https:';
            batchLinkList = [];
            batchLinkListAll = [];
            if(id.indexOf('direct') != -1){
                batchLinkList = getDirectBatchLink(linkType);
                tip = '显示所有选中文件的直接下载链接，文件夹显示为打包下载的链接';
                if(batchLinkList.length === 0){
                    alert('没有链接可以显示，API链接不要全部选中文件夹！');
                    return;
                }
                dialog.open({title:'批量链接',type:'batch',list:batchLinkList,tip:tip,showcopy:true});
            } else if(id.indexOf('api') != -1){
                batchLinkList = getAPIBatchLink(linkType);
                tip = '显示所有选中文件的API下载链接，不显示文件夹';
                if(batchLinkList.length === 0){
                    alert('没有链接可以显示，API链接不要全部选中文件夹！');
                    return;
                }
                dialog.open({title:'批量链接',type:'batch',list:batchLinkList,tip:tip,showcopy:true});
            } else if(id.indexOf('outerlink') != -1){
                batchLinkListAll = getOuterlinkBatchLinkAll();
                batchLinkList = getOuterlinkBatchLinkFirst(batchLinkListAll);
                tip = '显示所有选中文件的外部下载链接，不显示文件夹';
                if(batchLinkList.length === 0){
                    alert('没有链接可以显示，API链接不要全部选中文件夹！');
                    return;
                }

                dialog.open({title:'批量链接',type:'batch',list:batchLinkList,tip:tip,showcopy:true,alllist:batchLinkListAll,showall:true});
            }

            //dialog.open({title:'批量链接',type:'batch',list:batchLinkList,tip:tip,showcopy:true});
        }

        function getDirectBatchLink(linkType){
            var list = [];
            $.each(selectFileList,function(index,element){
                var downloadType,downloadLink,result;
                if(element.isdir == 0)
                    downloadType = 'dlink';
                else
                    downloadType = 'batch';
                fid_list = getFidList([element]);
                result = getDownloadLinkWithPanAPI(downloadType);
                if(result.errno == 0){
                    if(downloadType == 'dlink')
                        downloadLink = result.dlink[0].dlink;
                    else if(downloadType == 'batch')
                        downloadLink = result.dlink;
                    downloadLink = downloadLink.replace(/^([A-Za-z]+):/,linkType);
                }else{
                    downloadLink = 'error';
                }
                list.push({filename:element.filename,downloadlink:downloadLink});
            });
            return list;
        }

        function getAPIBatchLink(linkType){
            var list = [];
            $.each(selectFileList,function(index,element){
                if(element.isdir == 1)
                    return;
                var downloadLink;
                downloadLink = getDownloadLinkWithRESTAPIBaidu(element.path);
                downloadLink = downloadLink.replace(/^([A-Za-z]+):/,linkType);
                list.push({filename:element.filename,downloadlink:downloadLink});
            });
            return list;
        }

        function getOuterlinkBatchLinkAll(){
            var list = [];
            $.each(selectFileList,function(index,element){
                var result;
                if(element.isdir == 1)
                    return;
                result = getDownloadLinkWithClientAPI(element.path);
                if(result.errno == 0){
                    //downloadLink = result.urls[0].url;
                    list.push({filename:element.filename,links:result.urls});
                }else{
                    //downloadLink = 'error';
                    list.push({filename:element.filename,links:[{rank:1,url:'error'}]});
                }
                //list.push({filename:element.filename,downloadlink:downloadLink});
            });
            return list;
        }

        function getOuterlinkBatchLinkFirst(list){
            var result = [];
            $.each(list,function(index,element){
                result.push({filename:element.filename,downloadlink:element.links[0].url});
            });
            return result;
        }

        function getSign(){
            var signFnc;
            try{
                signFnc = new Function("return " + yunData.sign2)();
            } catch(e){
                throw new Error(e.message);
            }
            return base64Encode(signFnc(yunData.sign5,yunData.sign1));
        }

        //获取当前目录
        function getPath(){
            var hash = location.hash;
            var regx = /(^|&|\/)path=([^&]*)(&|$)/i;
            var result = hash.match(regx);
            return decodeURIComponent(result[2]);
        }

        //获取分类显示的类别，即地址栏中的type
        function getCategory(){
            var hash = location.hash;
            var regx = /(^|&|\/)type=([^&]*)(&|$)/i;
            var result = hash.match(regx);
            return decodeURIComponent(result[2]);
        }

        function getSearchKey(){
            var hash = location.hash;
            var regx = /(^|&|\/)key=([^&]*)(&|$)/i;
            var result = hash.match(regx);
            return decodeURIComponent(result[2]);
        }

        //获取当前页面(list或者category)
        function getCurrentPage(){
            var hash = location.hash;
            return decodeURIComponent(hash.substring(hash.indexOf('#')+1,hash.indexOf('/')));
        }

        //获取文件列表
        function getFileList(){
            var filelist = [];
            var listUrl = panAPIUrl + "list";
            var path = getPath();
            logid = getLogID();
            var params = {
                dir:path,
                bdstoken:bdstoken,
                logid:logid,
                order:'size',
                desc:0,
                clienttype:0,
                showempty:0,
                web:1,
                channel:'chunlei',
                appid:250528
            };
            $.ajax({
                url:listUrl,
                async:false,
                method:'GET',
                data:params,
                success:function(response){
                    filelist = 0===response.errno ? response.list : [];
                }
            });
            return filelist;
        }

        //获取分类页面下的文件列表
        function getCategoryFileList(){
            var filelist = [];
            var listUrl = panAPIUrl + "categorylist";
            var category = getCategory();
            logid = getLogID();
            var params = {
                category:category,
                bdstoken:bdstoken,
                logid:logid,
                order:'size',
                desc:0,
                clienttype:0,
                showempty:0,
                web:1,
                channel:'chunlei',
                appid:250528
            };
            $.ajax({
                url:listUrl,
                async:false,
                method:'GET',
                data:params,
                success:function(response){
                    filelist = 0===response.errno ? response.info : [];
                }
            });
            return filelist;
        }

        function getSearchFileList(){
            var filelist = [];
            var listUrl = panAPIUrl + 'search';
            logid = getLogID();
            searchKey = getSearchKey();
            var params = {
                recursion:1,
                order:'time',
                desc:1,
                showempty:0,
                web:1,
                page:1,
                num:100,
                key:searchKey,
                channel:'chunlei',
                app_id:250528,
                bdstoken:bdstoken,
                logid:logid,
                clienttype:0
            };
            $.ajax({
                url:listUrl,
                async:false,
                method:'GET',
                data:params,
                success:function(response){
                    filelist = 0===response.errno ? response.list : [];
                }
            });
            return filelist;
        }

        //生成下载时的fid_list参数
        function getFidList(list){
            var fidlist = null;
            if (list.length === 0)
                return null;
            var fileidlist = [];
            $.each(list,function(index,element){
                fileidlist.push(element.fs_id);
            });
            fidlist = '[' + fileidlist + ']';
            return fidlist;
        }

        function getTimestamp(){
            return yunData.timestamp;
        }

        function getBDStoken(){
            return yunData.MYBDSTOKEN;
        }

        //获取直接下载地址
        //这个地址不是直接下载地址，访问这个地址会返回302，response header中的location才是真实下载地址
        //暂时没有找到提取方法
        function getDownloadLinkWithPanAPI(type){
            var downloadUrl = panAPIUrl + "download";
            var result;
            logid = getLogID();
            var params= {
                sign:sign,
                timestamp:timestamp,
                fidlist:fid_list,
                type:type,
                channel:'chunlei',
                web:1,
                app_id:250528,
                bdstoken:bdstoken,
                logid:logid,
                clienttype:0
            };
            $.ajax({
                url:downloadUrl,
                async:false,
                method:'GET',
                data:params,
                success:function(response){
                    result = response;
                }
            });
            return result;
        }

        function getDownloadLinkWithRESTAPIBaidu(path){
            var link = restAPIUrl + 'file?method=download&app_id=250528&path=' + encodeURIComponent(path);
            return link;
        }

        function getDownloadLinkWithRESTAPIES(path){
            var link = restAPIUrl + 'file?method=download&app_id=266719&path=' + encodeURIComponent(path);
            return link;
        }

        function getDownloadLinkWithClientAPI(path){
            var result;
            var url = clientAPIUrl + 'file?method=locatedownload&app_id=250528&ver=4.0&path=' + encodeURIComponent(path);
            $.ajax({
                url:url,
                method:'POST',
                xhrFields: {
                    withCredentials: true
                },
                async:false,
                success:function(response){
                    result = JSON.parse(response);
                },
                statusCode:{
                    404:function(response){
                        result = response;
                    }
                }
            });
            if(result){
                if(result.error_code == undefined){
                    if(result.urls == undefined){
                        result.errno = 2;
                    }else{
                        $.each(result.urls,function(index,element){
                            result.urls[index].url = element.url.replace('\\','');
                        });
                        result.errno = 0;
                    }
                }else if(result.error_code == 31066){
                    result.errno = 1;
                }else{
                    result.errno = -1;
                }
            }else{
                result = {};
                result.errno = -1;
            }
            return result;
        }

        function execDownload(link){
            slog("下载链接："+link);
            $('#helperdownloadiframe').attr('src',link);
        }

        function createIframe(){
            var $div = $('<div class="helper-hide" style="padding:0;margin:0;display:block"></div>');
            var $iframe = $('<iframe src="javascript:void(0)" id="helperdownloadiframe" style="display:none"></iframe>');
            $div.append($iframe);
            $('body').append($div);

        }
    }

    //分享页面的下载助手
    function PanShareHelper(){
        var yunData,sign,timestamp,bdstoken,channel,clienttype,web,app_id,logid,encrypt,product,uk,primaryid,fid_list,extra,shareid;
        var vcode;
        var shareType,buttonTarget,currentPath,list_grid_status,observer,dialog,vcodeDialog;
        var fileList=[],selectFileList=[];
        var panAPIUrl = location.protocol + "//" + location.host + "/api/";
        var shareListUrl = location.protocol + "//" + location.host + "/share/list";

        this.init = function(){
            yunData = unsafeWindow.yunData;
            slog('yunData:',yunData);
            if(yunData === undefined || yunData.FILEINFO == null){
                slog('页面未正常加载，或者百度已经更新！');
                return;
            }
            initParams();
            addButton();
            dialog = new Dialog({addCopy:false});
            vcodeDialog = new VCodeDialog(refreshVCode,confirmClick);
            createIframe();

            if(!isSingleShare()){
                registerEventListener();
                createObserver();
            }

            slog('分享直接下载加载成功!');
        };

        function initParams(){
            shareType = getShareType();
            sign = yunData.SIGN;
            timestamp = yunData.TIMESTAMP;
            bdstoken = yunData.MYBDSTOKEN;
            channel = 'chunlei';
            clienttype = 0;
            web = 1;
            app_id = 250528;
            logid = getLogID();
            encrypt = 0;
            product = 'share';
            primaryid = yunData.SHARE_ID;
            uk = yunData.SHARE_UK;

            if(shareType == 'secret'){
                extra = getExtra();
            }
            if(isSingleShare()){
                var obj = {};
                if(yunData.CATEGORY == 2){
                    obj.filename = yunData.FILENAME;
                    obj.path = yunData.PATH;
                    obj.fs_id = yunData.FS_ID;
                    obj.isdir = 0;
                } else {
                    obj.filename = yunData.FILEINFO[0].server_filename,
                        obj.path = yunData.FILEINFO[0].path,
                        obj.fs_id = yunData.FILEINFO[0].fs_id,
                        obj.isdir =yunData.FILEINFO[0].isdir
                }
                selectFileList.push(obj);
            } else {
                shareid = yunData.SHARE_ID;
                currentPath = getPath();
                list_grid_status = getListGridStatus();
                fileList = getFileList();
            }
        }

        //判断分享类型（public或者secret）
        function getShareType(){
            return yunData.SHARE_PUBLIC===1 ? 'public' : 'secret';
        }

        //判断是单个文件分享还是文件夹或者多文件分享
        function isSingleShare(){
            return yunData.getContext === undefined ? true : false;
        }

        //判断是否为自己的分享链接
        function isSelfShare(){
            return yunData.MYSELF == 1 ? true : false;
        }

        function getExtra(){
            var seKey = decodeURIComponent(getCookie('BDCLND'));
            return '{' + '"sekey":"' + seKey + '"' + "}";
        }

        //获取当前目录
        function getPath(){
            var hash = location.hash;
            var regx = /(^|&|\/)path=([^&]*)(&|$)/i;
            var result = hash.match(regx);
            return decodeURIComponent(result[2]);
        }

        //获取当前的视图模式
        function getListGridStatus(){
            var status = 'list';
            var $status_div = $('div.list-grid-switch');
            if ($status_div.hasClass('list-switched-on')){
                status = 'list';
            } else if ($status_div.hasClass('grid-switched-on')) {
                status = 'grid';
            }
            return status;
        }

        //添加下载助手按钮
        function addButton(){
            if(isSingleShare()){
                $('div.slide-show-right').css('width','500px');
                $('div.frame-main').css('width','96%');
                $('div.share-file-viewer').css('width','740px').css('margin-left','auto').css('margin-right','auto');
            }
            else
                $('div.slide-show-right').css('width','500px');
            var $dropdownbutton = $('<span class="g-dropdown-button"></span>');
            var $dropdownbutton_a = $('<a class="g-button" data-button-id="b200" data-button-index="200" href="javascript:void(0);"></a>');
            var $dropdownbutton_a_span = $('<span class="g-button-right"><em class="icon icon-download" title="百度网盘下载助手"></em><span class="text" style="width: auto;">下载助手</span></span>');
            var $dropdownbutton_span = $('<span class="menu" style="width:auto;z-index:41"></span>');

            var $downloadButton = $('<a data-menu-id="b-menu207" class="g-button-menu" href="javascript:void(0);">直接下载</a>');
            var $linkButton = $('<a data-menu-id="b-menu208" class="g-button-menu" href="javascript:void(0);">显示链接</a>');

            $dropdownbutton_span.append($downloadButton).append($linkButton);
            $dropdownbutton_a.append($dropdownbutton_a_span);
            $dropdownbutton.append($dropdownbutton_a).append($dropdownbutton_span);

            $dropdownbutton.hover(function(){
                $dropdownbutton.toggleClass('button-open');
            });

            $downloadButton.click(downloadButtonClick);
            $linkButton.click(linkButtonClick);

            $('div.module-share-top-bar div.bar div.button-box').append($dropdownbutton);
        }

        function createIframe(){
            var $div = $('<div class="helper-hide" style="padding:0;margin:0;display:block"></div>');
            var $iframe = $('<iframe src="javascript:void(0)" id="helperdownloadiframe" style="display:none"></iframe>');
            $div.append($iframe);
            $('body').append($div);
        }

        function registerEventListener(){
            registerHashChange();
            registerListGridStatus();
            registerCheckbox();
            registerAllCheckbox();
            registerFileSelect();
        }

        //监视地址栏#标签变化
        function registerHashChange(){
            window.addEventListener('hashchange',function(e){
                list_grid_status = getListGridStatus();
                if(currentPath == getPath()){
                    return;
                } else {
                    currentPath = getPath();
                    refreshFileList();
                    refreshSelectFileList();
                }
            });
        }

        function refreshFileList(){
            fileList = getFileList();
        }

        function refreshSelectFileList(){
            selectFileList = [];
        }

        //监视视图变化
        function registerListGridStatus(){
            var $a_list = $('a[node-type=list-switch]');
            $a_list.click(function(){
                list_grid_status = 'list';
            });

            var $a_grid = $('a[node-type=grid-switch]');
            $a_grid.click(function(){
                list_grid_status = 'grid';
            });
        }

        //监视文件选择框
        function registerCheckbox(){
            //var $checkbox = $('span.checkbox');
            var $checkbox = $('span.'+wordMap['checkbox']);
            $checkbox.each(function(index,element){
                $(element).bind('click',function(e){
                    var $parent = $(this).parent();
                    var filename;
                    if(list_grid_status == 'list') {
                        filename = $('div.file-name div.text a',$parent).attr('title');
                    }else if(list_grid_status == 'grid'){
                        filename = $('div.file-name a',$parent).attr('title');
                    }
                    if($parent.hasClass('item-active')){
                        slog('取消选中文件：'+filename);
                        for(var i=0;i<selectFileList.length;i++){
                            if(selectFileList[i].filename == filename){
                                selectFileList.splice(i,1);
                            }
                        }
                    }else{
                        slog('选中文件：'+filename);
                        $.each(fileList,function(index,element){
                            if(element.server_filename == filename){
                                var obj = {
                                    filename:element.server_filename,
                                    path:element.path,
                                    fs_id:element.fs_id,
                                    isdir:element.isdir
                                };
                                selectFileList.push(obj);
                            }
                        });
                    }
                });
            });
        }

        function unregisterCheckbox(){
            //var $checkbox = $('span.checkbox');
            var $checkbox = $('span.'+wordMap['checkbox']);
            $checkbox.each(function(index,element){
                $(element).unbind('click');
            });
        }

        //监视全选框
        function registerAllCheckbox(){
            //var $checkbox = $('div.col-item.check');
            var $checkbox = $('div.'+wordMap['col-item']+'.'+wordMap['check']);
            $checkbox.each(function(index,element){
                $(element).bind('click',function(e){
                    var $parent = $(this).parent();
                    //if($parent.hasClass('checked')){
                    if($parent.hasClass(wordMap['checked'])){
                        slog('取消全选');
                        selectFileList = [];
                    } else {
                        slog('全部选中');
                        selectFileList = [];
                        $.each(fileList,function(index,element){
                            var obj = {
                                filename:element.server_filename,
                                path:element.path,
                                fs_id:element.fs_id,
                                isdir:element.isdir
                            };
                            selectFileList.push(obj);
                        });
                    }
                });
            });
        }

        function unregisterAllCheckbox(){
            //var $checkbox = $('div.col-item.check');
            var $checkbox = $('div.'+wordMap['col-item']+'.'+wordMap['check']);
            $checkbox.each(function(index,element){
                $(element).unbind('click');
            });
        }

        //监视单个文件选中
        function registerFileSelect(){
            //var $dd = $('div.list-view dd');
            var $dd = $('div.'+wordMap['list-view']+' dd');
            $dd.each(function(index,element){
                $(element).bind('click',function(e){
                    var nodeName = e.target.nodeName.toLowerCase();
                    if(nodeName != 'span' && nodeName != 'a' && nodeName != 'em') {
                        selectFileList = [];
                        var filename = $('div.file-name div.text a',$(this)).attr('title');
                        slog('选中文件：' + filename);
                        $.each(fileList,function(index,element){
                            if(element.server_filename == filename){
                                var obj = {
                                    filename:element.server_filename,
                                    path:element.path,
                                    fs_id:element.fs_id,
                                    isdir:element.isdir
                                };
                                selectFileList.push(obj);
                            }
                        });
                    }
                });
            });
        }

        function unregisterFileSelect(){
            //var $dd = $('div.list-view dd');
            var $dd = $('div.'+wordMap['list-view']+' dd');
            $dd.each(function(index,element){
                $(element).unbind('click');
            });
        }

        //监视文件列表显示变化
        function createObserver(){
            var MutationObserver = window.MutationObserver;
            var options = {
                'childList': true
            };
            observer = new MutationObserver(function(mutations){
                unregisterCheckbox();
                unregisterAllCheckbox();
                unregisterFileSelect();
                registerCheckbox();
                registerAllCheckbox();
                registerFileSelect(); 
            });
            //var list_view = document.querySelector('.list-view');
            //var grid_view = document.querySelector('.grid-view');
            
            var list_view = document.querySelector('.'+wordMap['list-view']);
            var grid_view = document.querySelector('.'+wordMap['grid-view']);

            observer.observe(list_view,options);
            observer.observe(grid_view,options);
        }

        //获取文件信息列表
        function getFileList(){
            var result = [];
            if(getPath() == '/'){
                result = yunData.FILEINFO;
            } else {
                logid = getLogID();
                var params = {
                    uk:uk,
                    shareid:shareid,
                    order:'other',
                    desc:1,
                    showempty:0,
                    web:web,
                    dir:getPath(),
                    t:Math.random(),
                    bdstoken:bdstoken,
                    channel:channel,
                    clienttype:clienttype,
                    app_id:app_id,
                    logid:logid
                };
                $.ajax({
                    url:shareListUrl,
                    method:'GET',
                    async:false,
                    data:params,
                    success:function(response){
                        if(response.errno === 0){
                            result = response.list;
                        }
                    }
                });
            }
            return result;
        }

        function downloadButtonClick(){
            slog('选中文件列表：',selectFileList);
            if(selectFileList.length === 0){
                alert('获取文件ID失败，请重试');
                return;
            }
            buttonTarget = 'download';
            var downloadLink = getDownloadLink();

            if(downloadLink.errno == -20) {
                vcode = getVCode();
                if(vcode.errno !== 0){
                    alert('获取验证码失败！');
                    return;
                }
                vcodeDialog.open(vcode);
            } else if(downloadLink.errno == 112){
                alert('页面过期，请刷新重试');
                return;
            } else if (downloadLink.errno === 0) {
                var link;
                if(selectFileList.length == 1 && selectFileList[0].isdir === 0)
                    link = downloadLink.list[0].dlink;
                else
                    link = downloadLink.dlink;
                execDownload(link);
            } else {
                alert('获取下载链接失败！');
                return;
            }
        }

        //获取验证码
        function getVCode(){
            var url = panAPIUrl + 'getvcode';
            var result;
            logid = getLogID();
            var params = {
                prod:'pan',
                t:Math.random(),
                bdstoken:bdstoken,
                channel:channel,
                clienttype:clienttype,
                web:web,
                app_id:app_id,
                logid:logid
            };
            $.ajax({
                url:url,
                method:'GET',
                async:false,
                data:params,
                success:function(response){
                    result = response;
                }
            });
            return result;
        }

        //刷新验证码
        function refreshVCode(){
            vcode = getVCode();
            $('#dialog-img').attr('src',vcode.img);
        }

        //验证码确认提交
        function confirmClick(){
            var val = $('#dialog-input').val();
            if(val.length === 0) {
                $('#dialog-err').text('请输入验证码');
                return;
            } else if(val.length < 4) {
                $('#dialog-err').text('验证码输入错误，请重新输入');
                return;
            } 
            var result = getDownloadLinkWithVCode(val);
            if(result.errno == -20){
                vcodeDialog.close();
                $('#dialog-err').text('验证码输入错误，请重新输入');
                refreshVCode();
                if(!vcode || vcode.errno !== 0){
                    alert('获取验证码失败！');
                    return;
                }
                vcodeDialog.open();
            } else if (result.errno === 0) {
                vcodeDialog.close();
                var link;
                if(selectFileList.length ==1 && selectFileList[0].isdir === 0)
                    link = result.list[0].dlink;
                else
                    link = result.dlink;
                if(buttonTarget == 'download'){
                    execDownload(link);
                } else if (buttonTarget == 'link') {
                    var filename = '';
                    $.each(selectFileList,function(index,element){
                        if(selectFileList.length == 1)
                            filename = element.filename;
                        else{
                            if(index ==0)
                                filename = element.filename;
                            else
                                filename = filename + ',' + element.filename;
                        }
                    });
                    var linkList = {
                        filename:filename,
                        urls:[
                            {url:link,rank:1}
                        ]
                    };
                    var tip = "显示获取的链接，可以使用右键迅雷下载，复制无用，需要传递cookie";
                    dialog.open({title:'下载链接',type:'link',list:linkList,tip:tip});
                }
            } else {
                alert('发生错误！');
                return;
            }
        }

        //生成下载用的fid_list参数
        function getFidList(){
            var fidlist = [];
            $.each(selectFileList,function(index,element){
                fidlist.push(element.fs_id);
            });
            return '[' + fidlist + ']';
        }

        function linkButtonClick(){
            slog('选中文件列表：',selectFileList);
            if(selectFileList.length === 0){
                alert('没有选中文件，请重试');
                return;
            }
            buttonTarget = 'link';
            var downloadLink = getDownloadLink();

            if(downloadLink.errno == -20) {
                vcode = getVCode();
                if(!vcode || vcode.errno !== 0){
                    alert('获取验证码失败！');
                    return;
                }
                vcodeDialog.open(vcode);
            } else if (downloadLink.errno == 112) {
                alert('页面过期，请刷新重试');
                return;
            } else if (downloadLink.errno === 0) {
                var link;
                if(selectFileList.length == 1 && selectFileList[0].isdir === 0)
                    link = downloadLink.list[0].dlink;
                else
                    link = downloadLink.dlink;
                if(selectFileList.length == 1)
                    $('#dialog-downloadlink').attr('href',link).text(link);
                else
                    $('#dialog-downloadlink').attr('href',link).text(link);
                var filename = '';
                $.each(selectFileList,function(index,element){
                    if(selectFileList.length == 1)
                        filename = element.filename;
                    else{
                        if(index ==0)
                            filename = element.filename;
                        else
                            filename = filename + ',' + element.filename;
                    }
                });
                var linkList = {
                    filename:filename,
                    urls:[
                        {url:link,rank:1}
                    ]
                };
                var tip = "显示获取的链接，可以使用右键迅雷下载，复制无用，需要传递cookie";
                dialog.open({title:'下载链接',type:'link',list:linkList,tip:tip});
            } else {
                alert('获取下载链接失败！');
                return;
            }
        }

        //获取下载链接
        function getDownloadLink(){
            var result;
            if(isSingleShare){
                fid_list = getFidList();
                logid = getLogID();
                var url = panAPIUrl + 'sharedownload?sign=' + sign + '&timestamp=' + timestamp + '&bdstoken=' + bdstoken + '&channel=' + channel + '&clienttype=' + clienttype + '&web='+ web + '&app_id=' + app_id + '&logid=' + logid;
                var params = {
                    encrypt:encrypt,
                    product:product,
                    uk:uk,
                    primaryid:primaryid,
                    fid_list:fid_list
                };
                if(shareType == 'secret'){
                    params.extra = extra;
                }
                if(selectFileList[0].isdir == 1 || selectFileList.length > 1){
                    params.type = 'batch';
                }
                $.ajax({
                    url:url,
                    method:'POST',
                    async:false,
                    data:params,
                    success:function(response){
                        result = response;
                    }
                });
            }
            return result;
        }

        //有验证码输入时获取下载链接
        function getDownloadLinkWithVCode(vcodeInput){
            var result;
            if(isSingleShare){
                fid_list = getFidList();
                var url = panAPIUrl + 'sharedownload?sign=' + sign + '&timestamp=' + timestamp + '&bdstoken=' + bdstoken + '&channel=' + channel + '&clienttype=' + clienttype + '&web='+ web + '&app_id=' + app_id + '&logid=' + logid;
                var params = {
                    encrypt:encrypt,
                    product:product,
                    vcode_input:vcodeInput,
                    vcode_str:vcode.vcode,
                    uk:uk,
                    primaryid:primaryid,
                    fid_list:fid_list
                };
                if(shareType == 'secret'){
                    params.extra = extra;
                }
                if(selectFileList[0].isdir == 1 || selectFileList.length > 1 ){
                    params.type = 'batch';
                }
                $.ajax({
                    url:url,
                    method:'POST',
                    async:false,
                    data:params,
                    success:function(response){
                        result = response;
                    }
                });
            }
            return result;
        }

        function execDownload(link){
            slog('下载链接：'+link);
            $('#helperdownloadiframe').attr('src',link);
        }
    }

    function base64Encode(t){
        var a, r, e, n, i, s, o = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        for (e = t.length,r = 0,a = ""; e > r; ) {
            if (n = 255 & t.charCodeAt(r++),r == e) {
                a += o.charAt(n >> 2);
                a += o.charAt((3 & n) << 4);
                a += "==";
                break;
            }
            if (i = t.charCodeAt(r++),r == e) {
                a += o.charAt(n >> 2);
                a += o.charAt((3 & n) << 4 | (240 & i) >> 4);
                a += o.charAt((15 & i) << 2);
                a += "=";
                break;
            }
            s = t.charCodeAt(r++);
            a += o.charAt(n >> 2);
            a += o.charAt((3 & n) << 4 | (240 & i) >> 4);
            a += o.charAt((15 & i) << 2 | (192 & s) >> 6);
            a += o.charAt(63 & s);
        }
        return a;
    }

    function detectPage(){
        var regx = /[\/].+[\/]/g;
        var page = location.pathname.match(regx);
        return page[0].replace(/\//g,'');
    }

    function getCookie(e) {
        var o, t;
        var n = document,c=decodeURI;
        return n.cookie.length > 0 && (o = n.cookie.indexOf(e + "="),-1 != o) ? (o = o + e.length + 1,t = n.cookie.indexOf(";", o),-1 == t && (t = n.cookie.length),c(n.cookie.substring(o, t))) : "";
    }

    function getLogID(){
        var name = "BAIDUID";
        var u = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/~！@#￥%……&";
        var d = /[\uD800-\uDBFF][\uDC00-\uDFFFF]|[^\x00-\x7F]/g;
        var f = String.fromCharCode;
        function l(e){
            if (e.length < 2) {
                var n = e.charCodeAt(0);
                return 128 > n ? e : 2048 > n ? f(192 | n >>> 6) + f(128 | 63 & n) : f(224 | n >>> 12 & 15) + f(128 | n >>> 6 & 63) + f(128 | 63 & n);
            }
            var n = 65536 + 1024 * (e.charCodeAt(0) - 55296) + (e.charCodeAt(1) - 56320);
            return f(240 | n >>> 18 & 7) + f(128 | n >>> 12 & 63) + f(128 | n >>> 6 & 63) + f(128 | 63 & n);
        }
        function g(e){
            return (e + "" + Math.random()).replace(d, l);
        }
        function m(e){
            var n = [0, 2, 1][e.length % 3];
            var t = e.charCodeAt(0) << 16 | (e.length > 1 ? e.charCodeAt(1) : 0) << 8 | (e.length > 2 ? e.charCodeAt(2) : 0);
            var o = [u.charAt(t >>> 18), u.charAt(t >>> 12 & 63), n >= 2 ? "=" : u.charAt(t >>> 6 & 63), n >= 1 ? "=" : u.charAt(63 & t)];
            return o.join("");
        }
        function h(e){
            return e.replace(/[\s\S]{1,3}/g, m);
        }
        function p(){
            return h(g((new Date()).getTime()));
        }
        function w(e,n){
            return n ? p(String(e)).replace(/[+\/]/g, function(e) {
                return "+" == e ? "-" : "_";
            }).replace(/=/g, "") : p(String(e));
        }
        return w(getCookie(name));
    }

    function Dialog(){
        var linkList = [];
        var showParams;
        var dialog,shadow;
        function createDialog(){
            var screenWidth = document.body.clientWidth;
            var dialogLeft = screenWidth>800 ? (screenWidth-800)/2 : 0;
            var $dialog_div = $('<div class="dialog" style="width: 800px; top: 0px; bottom: auto; left: '+dialogLeft+'px; right: auto; display: hidden; visibility: visible; z-index: 52;"></div>');
            var $dialog_header = $('<div class="dialog-header"><h3><span class="dialog-title" style="display:inline-block;width:740px;white-space:nowrap;overflow-x:hidden;text-overflow:ellipsis"></span></h3></div>');
            var $dialog_control = $('<div class="dialog-control"><span class="dialog-icon dialog-close">×</span></div>');
            var $dialog_body = $('<div class="dialog-body" style="max-height:450px;overflow-y:auto;padding:0 20px;"></div>');
            var $dialog_tip = $('<div class="dialog-tip" style="padding-left:20px;background-color:#faf2d3;border-top: 1px solid #c4dbfe;"><p></p></div>');

            $dialog_div.append($dialog_header.append($dialog_control)).append($dialog_body);

            //var $dialog_textarea = $('<textarea class="dialog-textarea" style="display:none;width"></textarea>');
            var $dialog_radio_div = $('<div class="dialog-radio" style="display:none;width:760px;padding-left:20px;padding-right:20px"></div>');
            var $dialog_radio_multi = $('<input type="radio" name="showmode" checked="checked" value="multi"><span>多行</span>');
            var $dialog_radio_single = $('<input type="radio" name="showmode" value="single"><span>单行</span>');
            $dialog_radio_div.append($dialog_radio_multi).append($dialog_radio_single);
            $dialog_div.append($dialog_radio_div);
            $('input[type=radio][name=showmode]',$dialog_radio_div).change(function(){
                var value = this.value;
                var $textarea = $('div.dialog-body textarea[name=dialog-textarea]',dialog);
                var content = $textarea.val();
                if(value == 'multi'){
                    content = content.replace(/\s+/g,'\n');
                    $textarea.css('height','300px');
                } else if(value == 'single'){
                    content = content.replace(/\n+/g,' ');
                    $textarea.css('height','');
                }
                $textarea.val(content);
            });

            var $dialog_button = $('<div class="dialog-button" style="display:none"></div>');
            var $dialog_button_div = $('<div style="display:table;margin:auto"></div>')
            var $dialog_copy_button = $('<button id="dialog-copy-button" style="display:none">复制</button>');
            var $dialog_edit_button = $('<button id="dialog-edit-button" style="display:none">编辑</button>');
            var $dialog_exit_button = $('<button id="dialog-exit-button" style="display:none">退出</button>');

            $dialog_button_div.append($dialog_copy_button).append($dialog_edit_button).append($dialog_exit_button);
            $dialog_button.append($dialog_button_div);
            $dialog_div.append($dialog_button);

            $dialog_copy_button.click(function(){
                var content = '';
                if(showParams.type == 'batch'){
                    $.each(linkList,function(index,element){
                        if(element.downloadlink == 'error')
                            return;
                        if(index == linkList.length-1)
                            content = content + element.downloadlink;
                        else
                            content =  content + element.downloadlink + '\n';
                    });
                } else if(showParams.type == 'link'){
                    $.each(linkList,function(index,element){
                        if(element.url == 'error')
                            return;
                        if(index == linkList.length-1)
                            content = content + element.url;
                        else
                            content =  content + element.url + '\n';
                    });
                }
                GM_setClipboard(content,'text');
                alert('已将链接复制到剪贴板！');
            });

            $dialog_edit_button.click(function(){
                var $dialog_textarea = $('div.dialog-body textarea[name=dialog-textarea]',dialog);
                var $dialog_item = $('div.dialog-body div',dialog);
                $dialog_item.hide();
                $dialog_copy_button.hide();
                $dialog_edit_button.hide();
                $dialog_textarea.show();
                $dialog_radio_div.show();
                $dialog_exit_button.show();
            });

            $dialog_exit_button.click(function(){
                var $dialog_textarea = $('div.dialog-body textarea[name=dialog-textarea]',dialog);
                var $dialog_item = $('div.dialog-body div',dialog);
                $dialog_textarea.hide();
                $dialog_radio_div.hide();
                $dialog_item.show();
                $dialog_exit_button.hide();
                $dialog_copy_button.show();
                $dialog_edit_button.show();
            });

            $dialog_div.append($dialog_tip);
            $('body').append($dialog_div);
            $dialog_div.dialogDrag();
            $dialog_control.click(dialogControl);
            return $dialog_div;
        }

        function createShadow(){
            var $shadow = $('<div class="dialog-shadow" style="position: fixed; left: 0px; top: 0px; z-index: 50; background: rgb(0, 0, 0) none repeat scroll 0% 0%; opacity: 0.5; width: 100%; height: 100%; display: none;"></div>');
            $('body').append($shadow);
            return $shadow;
        }

        this.open = function(params){
            showParams = params;
            linkList = [];
            if(params.type == 'link'){
                linkList = params.list.urls;
                $('div.dialog-header h3 span.dialog-title',dialog).text(params.title + "：" +params.list.filename);
                $.each(params.list.urls,function(index,element){
                    var $div = $('<div><div style="width:30px;float:left">'+element.rank+':</div><div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><a href="'+element.url+'">'+element.url+'</a></div></div>');
                    $('div.dialog-body',dialog).append($div);
                });
            } else if(params.type == 'batch'){
                linkList = params.list;
                $('div.dialog-header h3 span.dialog-title',dialog).text(params.title);
                if(params.showall){
                    $.each(params.list,function(index,element){
                        var $item_div = $('<div class="item-container" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap"></div>');
                        var $item_name = $('<div style="width:100px;float:left;overflow:hidden;text-overflow:ellipsis" title="'+element.filename+'">'+element.filename+'</div>');
                        var $item_sep = $('<div style="width:12px;float:left"><span>：</span></div>');
                        var $item_link_div = $('<div class="item-link" style="float:left;width:618px;"></div>');
                        var $item_first = $('<div class="item-first" style="overflow:hidden;text-overflow:ellipsis"><a href="'+element.downloadlink+'">'+element.downloadlink+'</a></div>');
                        $item_link_div.append($item_first);
                        $.each(params.alllist[index].links,function(n,item){
                            if(element.downloadlink == item.url)
                                return;
                            var $item = $('<div class="item-ex" style="display:none;overflow:hidden;text-overflow:ellipsis"><a href="'+item.url+'">'+item.url+'</a></div>');
                            $item_link_div.append($item);
                        });
                        var $item_ex = $('<div style="width:15px;float:left;cursor:pointer;text-align:center;font-size:16px"><span>+</span></div>');
                        $item_div.append($item_name).append($item_sep).append($item_link_div).append($item_ex);
                        $item_ex.click(function(){
                            var $parent = $(this).parent();
                            $parent.toggleClass('showall');
                            if($parent.hasClass('showall')){
                                $(this).text('-');
                                $('div.item-link div.item-ex',$parent).show();
                            } else {
                                $(this).text('+');
                                $('div.item-link div.item-ex',$parent).hide();
                            }
                        });
                        $('div.dialog-body',dialog).append($item_div);
                    });
                }else{
                    $.each(params.list,function(index,element){
                        var $div = $('<div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap"><div style="width:100px;float:left;overflow:hidden;text-overflow:ellipsis" title="'+element.filename+'">'+element.filename+'</div><span>：</span><a href="'+element.downloadlink+'">'+element.downloadlink+'</a></div>');
                        $('div.dialog-body',dialog).append($div);
                    });
                }
            }

            if(params.tip){
                $('div.dialog-tip p',dialog).text(params.tip);
            }

            if(params.showcopy){
                $('div.dialog-button',dialog).show();
                $('div.dialog-button button#dialog-copy-button',dialog).show();
            }
            if(params.showedit){
                $('div.dialog-button',dialog).show();
                $('div.dialog-button button#dialog-edit-button',dialog).show();
                var $dialog_textarea = $('<textarea name="dialog-textarea" style="display:none;resize:none;width:758px;height:300px;white-space:pre;word-wrap:normal;overflow-x:scroll"></textarea>');
                var content = '';
                if(showParams.type == 'batch'){
                    $.each(linkList,function(index,element){
                        if(element.downloadlink == 'error')
                            return;
                        if(index == linkList.length-1)
                            content = content + element.downloadlink;
                        else
                            content =  content + element.downloadlink + '\n';
                    });
                } else if(showParams.type == 'link'){
                    $.each(linkList,function(index,element){
                        if(element.url == 'error')
                            return;
                        if(index == linkList.length-1)
                            content = content + element.url;
                        else
                            content =  content + element.url + '\n';
                    });
                }
                $dialog_textarea.val(content);
                $('div.dialog-body',dialog).append($dialog_textarea);
            }

            shadow.show();
            dialog.show();
        }

        this.close = function(){
            dialogControl();
        }

        function dialogControl(){
            $('div.dialog-body',dialog).children().remove();
            $('div.dialog-header h3 span.dialog-title',dialog).text('');
            $('div.dialog-tip p',dialog).text('');
            $('div.dialog-button',dialog).hide();
            $('div.dialog-radio input[type=radio][name=showmode][value=multi]',dialog).prop('checked',true);
            $('div.dialog-radio',dialog).hide();
            $('div.dialog-button button#dialog-copy-button',dialog).hide();
            $('div.dialog-button button#dialog-edit-button',dialog).hide();
            $('div.dialog-button button#dialog-exit-button',dialog).hide();
            dialog.hide();
            shadow.hide();
        }

        dialog = createDialog();
        shadow = createShadow();
    }

    function VCodeDialog(refreshVCode,confirmClick){
        var dialog,shadow;
        function createDialog(){
            var screenWidth = document.body.clientWidth;
            var dialogLeft = screenWidth>520 ? (screenWidth-520)/2 : 0;
            var $dialog_div = $('<div class="dialog" id="dialog-vcode" style="width:520px;top:0px;bottom:auto;left:'+dialogLeft+'px;right:auto;display:none;visibility:visible;z-index:52"></div>');
            var $dialog_header = $('<div class="dialog-header"><h3><span class="dialog-header-title"><em class="select-text">提示</em></span></h3></div>');
            var $dialog_control = $('<div class="dialog-control"><span class="dialog-icon dialog-close icon icon-close"><span class="sicon">x</span></span></div>');
            var $dialog_body = $('<div class="dialog-body"></div>');
            var $dialog_body_div = $('<div style="text-align:center;padding:22px"></div>');
            var $dialog_body_download_verify = $('<div class="download-verify" style="margin-top:10px;padding:0 28px;text-align:left;font-size:12px;"></div>');
            var $dialog_verify_body = $('<div class="verify-body">请输入验证码：</div>');
            var $dialog_input = $('<input id="dialog-input" type="text" style="padding:3px;width:85px;height:23px;border:1px solid #c6c6c6;background-color:white;vertical-align:middle;" class="input-code" maxlength="4">');
            var $dialog_img = $('<img id="dialog-img" class="img-code" style="margin-left:10px;vertical-align:middle;" alt="点击换一张" src="" width="100" height="30">');
            var $dialog_refresh = $('<a href="javascript:void(0)" style="text-decoration:underline;" class="underline">换一张</a>');
            var $dialog_err = $('<div id="dialog-err" style="padding-left:84px;height:18px;color:#d80000" class="verify-error"></div>');
            var $dialog_footer = $('<div class="dialog-footer g-clearfix"></div>');
            var $dialog_confirm_button = $('<a class="g-button g-button-blue" data-button-id="" data-button-index href="javascript:void(0)" style="padding-left:36px"><span class="g-button-right" style="padding-right:36px;"><span class="text" style="width:auto;">确定</span></span></a>');
            var $dialog_cancel_button = $('<a class="g-button" data-button-id="" data-button-index href="javascript:void(0);" style="padding-left: 36px;"><span class="g-button-right" style="padding-right: 36px;"><span class="text" style="width: auto;">取消</span></span></a>');

            $dialog_header.append($dialog_control);
            $dialog_verify_body.append($dialog_input).append($dialog_img).append($dialog_refresh);
            $dialog_body_download_verify.append($dialog_verify_body).append($dialog_err);
            $dialog_body_div.append($dialog_body_download_verify);
            $dialog_body.append($dialog_body_div);
            $dialog_footer.append($dialog_confirm_button).append($dialog_cancel_button);
            $dialog_div.append($dialog_header).append($dialog_body).append($dialog_footer);
            $('body').append($dialog_div);

            $dialog_div.dialogDrag();

            $dialog_control.click(dialogControl);
            $dialog_img.click(refreshVCode);
            $dialog_refresh.click(refreshVCode);
            $dialog_input.keypress(function(event){
                if(event.which == 13)
                    confirmClick();
            });
            $dialog_confirm_button.click(confirmClick);
            $dialog_cancel_button.click(dialogControl);
            $dialog_input.click(function(){
                $('#dialog-err').text('');
            });
            return $dialog_div;
        }
        this.open = function(vcode){
            if(vcode)
                $('#dialog-img').attr('src',vcode.img);
            dialog.show();
            shadow.show();
        }
        this.close = function(){
            dialogControl();
        }
        dialog = createDialog();
        shadow = $('div.dialog-shadow');
        function dialogControl(){
            $('#dialog-img',dialog).attr('src','');
            $('#dialog-err').text('');
            dialog.hide();
            shadow.hide();
        }
    }

    $.fn.dialogDrag = function(){
        var mouseInitX,mouseInitY,dialogInitX,dialogInitY;
        var screenWidth = document.body.clientWidth;
        var $parent = this;
        $('div.dialog-header',this).mousedown(function(event){
            mouseInitX = parseInt(event.pageX);
            mouseInitY = parseInt(event.pageY);
            dialogInitX = parseInt($parent.css('left').replace('px',''));
            dialogInitY = parseInt($parent.css('top').replace('px',''));
            $(this).mousemove(function(event){
                var tempX = dialogInitX + parseInt(event.pageX) - mouseInitX;
                var tempY = dialogInitY + parseInt(event.pageY) - mouseInitY;
                var width = parseInt($parent.css('width').replace('px',''));
                tempX = tempX<0 ? 0 : tempX>screenWidth-width ? screenWidth-width : tempX;
                tempY = tempY<0 ? 0 : tempY;
                $parent.css('left',tempX+'px').css('top',tempY+'px');
            });
        });
        $('div.dialog-header',this).mouseup(function(event){
            $(this).unbind('mousemove');
        });
    }

})();
