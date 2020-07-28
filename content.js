
console.log('content script executing...');


let WAIT_TIME = 1000;
let BATCH_SIZE = 5;
let artist_len = 0;
let artist_count = 0;

//listen to content script message
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse){
    console.log("received request from popup", request);
    if(request.artistList != undefined){
        artist_len = request.artistList.length; 
        artist_count = 0;
        search(request.artistList, batchSize=BATCH_SIZE).then(function (results){
            //send response back to popup
            chrome.runtime.sendMessage({action: 'search_result', response: results.flat()}, 
            function(response) {
                console.log("results sent back to popup.");
            });
        },
        //error
        function (err){
            console.log('error');
            chrome.runtime.sendMessage({action: 'error'}, 
            function(response) {
                console.log("error msg sent back to popup.");
            });
        }); //then
    }
    else{
        console.log("Empty query!");
        sendResponse({'response': 'error'});
    }
});//onMessage

function search(artistArr, batchSize){
    let batches = Math.ceil(artistArr.length / batchSize);
    let threads = [];

    //execute a search batch every WAIT_TIME
    for(let batch=0; batch<batches; batch++){
        let start = batch*batchSize;
        let end = start+batchSize;
        if(end > artistArr.length)
            end = artistArr.length;
        threads.push(
            delayedSearchBatch(artistArr.slice(start, end),
                WAIT_TIME * batch)
        );
        console.log("batch ", batch, " waited ", WAIT_TIME * batch, " ms");
    }
    
    return Promise.all(threads)
}

function delayedSearchBatch(artistBatch, waitTime){
    //execute searchBatch after waitime
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            console.log("batch ", artistBatch, " started.");
            searchBatch(artistBatch).then((results) => {
                resolve(results);
            }, function (err){reject(err);});
        }, waitTime);
    });
}

function searchBatch(artistBatch){
    //get all search result from api
    if(artistBatch.length <= 0)
        return Promise.resolve();

    return new Promise(function(resolve, reject){
        let threads = []
        for(let artist of artistBatch)
            threads.push(searchThread(artist));

        Promise.all(threads).then(function(results){
            console.log('all search done!');
            resolve(results);
        },
        //error
        function(err){
            reject(err);
        }); //then
    });
}

function searchThread(artist){
    return new Promise(function(resolve, reject){
        $.ajax({
            url: "https://nhentai.net/api/galleries/search?query="+artist+"&page=1",
            success: function(result){
                console.log("search for "+artist+" done.");
                let percent = Math.floor(100*(++artist_count / artist_len));
                sendLoadPercent(percent.toString());
                resolve(result);
            },
            error: function(err){
                console.log('err');
                reject(err);
            }
        }); //ajax
    });
}

function sendLoadPercent(per){
    chrome.runtime.sendMessage({action: 'percent', percent: per}, function(response) {});
}