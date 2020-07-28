
$(document).ready(function() {

const MAX_BOOKS = 40;


//-------init UI---------
console.log("pop up script executing...");

//bind btns
$("#submit-btn").bind("click", onSubmitClick);
$("#artist-input").bind("keypress", function(e){
    if(e.key == 'Enter')
        onSubmitClick();
});
$("#logo").bind("click", function(){
    window.open("https://nhentai.net");
});
$("#reload-btn").bind('click', onReloadClick);

//display first tab
$('#tabs li:not(:first)').addClass('inactive');
$('.tab-content:not(:first)').hide();
$('#tabs li').bind('click', function(e){
    onTabClick(e);
});

//----listen to content response----------
chrome.runtime.onMessage.addListener(function(results, sender, sendResponse) {
    console.log('got message.')
    if(results.action == 'search_result'){
        console.log("got search results from content.", results.response);
        showBooks(results.response, MAX_BOOKS);
        let t = new Date();
        saveCache(results.response, t.toDateString());
        updateTime(t.toDateString());
    }
    else if(results.action == 'percent'){
        console.log("got loading progress from content.", results.percent);
        updatePercent(results.percent);
    }
    else {
        console.log("error.");
        alert("Failed to load results!");
        $("#tab1 #reload-btn").text("Reload");
    }
});


let artistArr = [];


//init for tab1---------------------
//load books cache from storage

chrome.storage.local.get(["books", "update_time"], function(data){
    if(Array.isArray(data["books"])){
        console.log("books list get success.", data["books"]);
        showBooks(data["books"], MAX_BOOKS);
    }
    if(data["update_time"]){
        console.log(data["update_time"])
        updateTime(data["update_time"]);
    }
}); //storage get


//init for tab2----------------
//get artist list
chrome.storage.local.get(["artists"], function(data){
    if(Array.isArray(data["artists"])){
        artistArr = data["artists"]; 
        console.log("artist list get success.", artistArr);
        showArtistList();
    }
});


//---------------------

function onSubmitClick(){
    let input = $("#artist-input");
    let name = input.val();
    if(name != ""){
        input.val("");
        artistArr.push(name);
        chrome.storage.local.set({"artists": artistArr}, function (){
            console.log('New artist add success.', artistArr)
            showArtistList();
        });
    }
}

function onXClick(btn){
    let li = btn.parentNode;
    let ul = li.parentNode.childNodes;
    console.log(ul);
    let index = Array.prototype.indexOf.call(ul, li);
    index = ul.length - index - 1;

    artistArr.splice(index, 1); //remove from arr
    chrome.storage.local.set({"artists": artistArr}, function(){
        console.log('Artist delete success.', artistArr);
        showArtistList();
    });
}

function onSpanClick(sp){
    let name = $(sp).text();
    window.open("https://nhentai.net/search/?q="+name);
}

function showArtistList(){
    let ul = $("#artist-ul");
    ul.text(""); //clear ul
    for(let i = artistArr.length-1; i >= 0 ; i--){
        let li = liCreator(artistArr[i])
        ul.append(li);
    }
    //update artist count
    $("#artist-tab-btn").text("Artists(" + artistArr.length.toString() + ")");
}

function liCreator(text){
    let li = $("<li></li>");

    //create span
    let span = $("<span></span>").addClass("artist-name").text(text);
    //set li event listener
    span.bind("click", function(e){
        onSpanClick(e.currentTarget);
    });
    li.append(span);
        
    //add X btn
    let btn = $("<button></button>").addClass("del-btn").text("X");
    btn.bind("click", function(e){
        onXClick(e.currentTarget); //pass in its parent li
    });
    li.append(btn);

    return li;
}

function onTabClick(t){
    let tag = $(t.currentTarget);
    let tagNo = tag.attr('href');
    $("#tabs li").addClass("inactive");
    tag.removeClass("inactive");
    $('.tab-content').hide();
    $('#'+tagNo).fadeIn();
}

function onReloadClick(){
    $("#books-ul").text("");
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if(tabs[0].url.match(/^https:\/\/nhentai\.net/)){
            chrome.tabs.sendMessage(tabs[0].id, {'artistList': artistArr}, function(response){});
        }else{
            alert('Man, you are not on nhentai.net! Try again.');
        }
    });
}

function showBooks(data, n){
    let cleanData = [];
    for(let artist of data)
        for(let book of artist.result)
            cleanData.push(book);
    
    cleanData.sort(function(a, b){
        return b.upload_date - a.upload_date;
    });

    for(let i=0; i<n; i++){
        $("#books-ul").append(createBookLi(cleanData[i].id.toString(), 
            cleanData[i].media_id.toString(), cleanData[i].images.thumbnail.t
            , cleanData[i].title.english));
    }
}

function createBookLi(id, mediaid, imgtype, title, language){
    let imtype = "jpg";
    if(imgtype == "p")
        imtype = "png";

    let li = $("<li class='book-li'></li>");
    let thumb = $("<div class='thumb-container'><img class='thumb' src=" + 
        "'https://t.nhentai.net/galleries/" + mediaid + "/thumb." +
        imtype + "' link='https://nhentai.net/g/" + id + "/'></div>");
    thumb.bind('click', function(e){
        onThumbClick(e.target);
    });
    let tt = $("<div class='book-title'>" + title + "</div>");
    li.append(thumb);
    li.append(tt);

    return li;
}

function saveCache(books, t){
    chrome.storage.local.set({"books": books, "update_time": t}, function(){
        console.log('books saved.', artistArr);
    });
}

function onThumbClick(imgtag){
    window.open(imgtag.getAttribute("link"));
}

function updateTime(t){
    $("#tab1 #date").text("last update: " + t);
}

function updatePercent(p){
    $("#tab1 #reload-btn").text(p+" %");
    if(p == "100")
        $("#tab1 #reload-btn").text("Reload");
}

}); //doc ready