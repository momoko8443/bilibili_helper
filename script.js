// ==UserScript==
// @name         Bilibili Helper
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        https://www.bilibili.com/video/av*
// @grant GM_xmlhttpRequest
// @connect 47.104.78.73
// ==/UserScript==
// @require http://code.jquery.com/jquery-latest.js

(function() {
    'use strict';
    // Your code here...
    var helpItems = [];
    var current_user = null;
    var current_avcode = window.location.href.split('/video/')[1].split('/')[0];
    var serviceURL = 'http://47.104.78.73:3000';
    setTimeout(function(){
        initDom();
        if(!isLogin()){
            generateLoginForm();
        }else{
            loadUserProfile();
        }
    },5000);
    function isLogin(){
        if(getJwt()){
            return true;
        }else{
            return false;
        }
    }
    function getJwt(){
        if (!window.localStorage) {
            alert('This browser does NOT support');
            return null;
        }
        return window.localStorage.getItem('jwt_bilibili_helper');
    }
    function saveJwt(token){
        window.localStorage.setItem('jwt_bilibili_helper',token);
    }
    function initDom(){
        loadStyle();
        $('#viewbox_report').append('<div id="bh_box"></div>');
        $('#bh_box').append('<h2 id="hb_title">Bilibili Helper v0.1</h2>');
        $('#bh_box').append('<hr>');
    }
    function loadStyle(){
        var style = document.createElement("style");
        style.type = "text/css";
        var text = document.createTextNode("#hb_title{font-size:18px} #bh_box {border: 2px #FB7299 solid; padding:10px} #hb_table {width:80%;} .bh_btn { width: 48px;margin: 4px;color: #fff;font-size: 12px;background-color: #00a1d6;border: none;border-radius: 4px;cursor: pointer;outline: none;}");
        style.appendChild(text);
        var head = document.getElementsByTagName("head")[0];
        head.appendChild(style);
    }
    function generateLoginForm(){
        $('#bh_box').append('<div><label>用户名: </label><input id="bh_username"><label>密码: </label><input id="bh_pwd" type="password"><br><button id="loginBtn">登录</button> / <button id="registryBtn">注册</button></div>');
        $('#loginBtn').click(function(){
            var username = $('#bh_username').val();
            var password = $('#bh_pwd').val();
            if(username && password){
                login(username, password);
            }
        });
        $('#registryBtn').click(function(){
            var username = $('#bh_username').val();
            var password = $('#bh_pwd').val();
            if(username && password){
                registry(username, password);
            }
        });
    }
    function login(username,password){
        var myData = new FormData();
        myData.append("username", username);
        myData.append("password", password);
        GM_xmlhttpRequest({
            method: "POST",
            url: serviceURL + "/token",
            data: myData,
            onload: function(result){
                var token = result.access_token;
                saveJwt(token);
                window.location.reload();
                alert('login success');
            },
            onerror: function(req, status, error){
                alert(error);
            }
        })
    }
    function registry(username,password){
        var myData = new FormData();
        myData.append("username", username);
        myData.append("password", password);
        GM_xmlhttpRequest({
            method: "POST",
            url: serviceURL + "/users",
            data: myData,
            onload: function(response){
                var result = JSON.parse(response.responseText);
                var token = result.access_token;
                saveJwt(token);
                window.location.reload();
                alert('registry success');
            },
            onerror: function(req, status, error){
                alert(error);
            }
        })
    }
    function loadHelpeItems(){
        GM_xmlhttpRequest ({
            method: "GET",
            url: serviceURL + "/api/protected/helps",
            headers: {
                Accept: "application/json; charset=utf-8",
                Authorization: "Bearer " + getJwt()
            },
            onload: function(response){
                var result = JSON.parse(response.responseText);
                helpItems = result;
                for(var i=0;i<helpItems.length;i++){
                    var item = helpItems[i];
                    for(var j=0;j<item.helpers.length;j++){
                        var helper = item.helpers[j];
                        if(current_user.username === helper.helper){
                            item.isHelped = true;
                            break;
                        }
                    }
                }
                generateHelpItemsView(helpItems);
                generatePublishView(helpItems);
                watching();
            },
            onerror: function(req, status, error){
                alert(error);
            }
        })
    }
    function generateHelpItemsView(items){
        $('#bh_box').append('<h3>已发布的求助:</h3>');
        $('#bh_box').append('<table id="hb_table" border="1"><tr><th>作品</th><th>已获助力(点)</th><th>发布人</th><th>发布时间</th><th></th></tr></table>');
        items.forEach((item)=>{
            var isRequester = false;
            if(item.requester === current_user.username){
                isRequester = true;
            }
            $('#hb_table').append('<tr id="'+ item.id +'"><tr>');
            $('#' + item.id).append('<td><a href="https://www.bilibili.com/video/"' + item.avcode +'>'+ item.avcode+'</a></td>');
            $('#' + item.id).append('<td><span>'+ item.score+'</span></td>');
            if(isRequester){
                $('#' + item.id).append('<td><span>'+ item.requester+' (你)</span></td>');
            }else{
                $('#' + item.id).append('<td><span>'+ item.requester+'</span></td>');
            }
            $('#' + item.id).append('<td><span>'+ new Date(item.create_time).toLocaleTimeString()+'</span></td>');
            if(item.isHelped){
                $('#' + item.id).append('<td><span>已助力</span></td>');
            }
            else if(isRequester){
                $('#' + item.id).append('<td><button class="bh_btn hb_detail_btn" data-avcode="'+item.avcode+'">看详情</button></td>');
            }
            else{
                $('#' + item.id).append('<td><button class="bh_btn">去助力</button></td>');
            }
        });
        $('#bh_box').append('<hr>');
        $('.hb_detail_btn').click(function(e){
            var avcode = e.currentTarget.dataset.avcode;
            var detail = "";
            for(var i=0;i<helpItems.length;i++){
                var item = helpItems[i];
                if(item.avcode === avcode){
                    for(var j=0;j<item.helpers.length;j++){
                        var helper = item.helpers[j];
                        detail += '用户: ' + helper.helper + ', 贡献: ' + helper.score + '\n';
                    }
                    break;
                }
            }
            if(detail){
                alert(detail);
            }
        });
    }
    function generatePublishView(existsItems){
        $('#bh_box').append('<h3>为当前视频发布求助（将消耗你10个点数）</h3>');
        $('#bh_box').append('<span>'+ current_avcode +'</span>');
        var isPublished = false;
        for(var i=0;i<existsItems.length;i++){
            if(existsItems[i].avcode === current_avcode){
                isPublished = true;
                break;
            }
        }
        if(!isPublished){
            $('#bh_box').append('<button class="bh_btn">发布</button>');
        }else{
            $('#bh_box').append('<span>   已发布</span>');
        }
        $('#bh_box').append('<hr>');
    }
    function loadUserProfile(){
        GM_xmlhttpRequest({
            method: "GET",
            url: serviceURL + "/api/protected/user",
            headers: {
                Accept: "application/json; charset=utf-8",
                Authorization: "Bearer " + getJwt()
            },
            onload: function(response){
               var result = JSON.parse(response.responseText);
               current_user = result;
               generateUserProfileView(result);
               loadHelpeItems();
            },
            onerror: function(req, status, error){
                alert(error);
            }
        })
    }
    function generateUserProfileView(user){
        $('#bh_box').append('<h3>欢迎！ '+ user.username +'</h3>');
        $('#bh_box').append('<span>您目前拥有点数:'+ user.coin +'</span>');
        $('#bh_box').append('<hr>');
    }
    function watching(){
        for(var i=0;i<helpItems.length;i++){
            if(helpItems[i].avcode === current_avcode && helpItems[i].requester !== current_user.username && !helpItems[i].isHelped){
                checkingHelp();
                break;
            }
        }
    }
    var timer = null;
    function checkingHelp(){
        timer = setInterval(function(){
            var score = 0;
            var isLike = $('span.like.on')[0];
            var isCoin = $('span.coin.on')[0];
            var isCollect = $('span.collect.on')[0];
            var isShare = $('span.share.on')[0];
            if(isLike){
                score++;
            }
            if(isCoin){
                score++;
            }
            if(isCollect){
                score++;
            }
            if(isShare){
                score++;
            }
            if(score > 0){
                recordHelp(score);
            }
        },10000);
    }
    function recordHelp(score){
        var myData = new FormData();
        myData.append("score", score);
        GM_xmlhttpRequest({
            method: "PUT",
            url: serviceURL+ "/api/protected/helps/" + current_avcode + "/helpers",
            headers: {
                Accept: "application/json; charset=utf-8",
                Authorization: "Bearer " + getJwt()
            },
            data: myData,
            success: function(result){
                window.clearInterval(timer);
                alert('助力成功!');
                window.location.reload();
            },
            error: function(req, status, error){
                alert(error);
            }
        })
    }
})();
