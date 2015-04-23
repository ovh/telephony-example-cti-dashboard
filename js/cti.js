/*
cti.js

This Javascript library is used to deals with long-polling requests from "https://events.voip.ovh.net" URL. It also contains angularJS 
controller for the CTI dashboard and basic javascript timer functions to count live call duration.

License :
MIT 

*/

var timer;

function timerFunc() {
    timer = setInterval(timerEvent, 1000);
}

function timerEvent() {
    var fieldsToUpdate = $("[name=fieldToUpdate]");

//    var ts2 = Date().getTime();
//    console.log(ts2);

    for (var i = 0; i<fieldsToUpdate.length; i++) {
        $(fieldsToUpdate[i]).html(parseInt($(fieldsToUpdate[i]).html()) + 1);
    }

    
    var scope = angular.element('[ng-controller=mainController]').scope()
    
    if (scope.reinitAuto)
    {
        var now = new Date();
        if ((now.getTime() - now.setHours(0,0,0,0)) < 10)
        {
            var jsonNumbers = JSON.stringify({});
            localStorage.setItem(scope.token + "-numbers", jsonNumbers)
            scope.notify = "Les options de cache ont été réinitialisées.";
            scope.login();
        }
    }
}

function gup( name )
{

    name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
    var regexS = "[\\?&]"+name+"=([^&#]*)";
    var regex = new RegExp( regexS );
    var results = regex.exec( window.location.href );
    if( results == null ){
        return "";
    }
    else
    {
        return results[1];
    }
}


var ctiApp = angular.module('ctiApp', []);

ctiApp.controller('mainController', function ($scope, $location) {
    $scope.status = "idle";
    $scope.session = "";
    $scope.token = "";
    $scope.logged = false;
    $scope.page = false;
    $scope.pagename = "Vue d'ensemble";
    $scope.cgiPath = "";
    $scope.hideSL = 0;
    $scope.reinitAuto = false;
    $scope.cgiSet = 0;
    $scope.calls = [];
    $scope.lastEvents = [];
    $scope.lastHuntingEvents = [];
    $scope.notify = "";
    $scope.number = "";
    $scope.numbersize = 0;
    $scope.numbers = {};
    $scope.liveEvent = "";
    $scope.memberCount = 0;
    $scope.cgiWindowWidth = "640";
    $scope.cgiWindowHeight = "480";
    $scope.cgiMode = "";

    $scope.poll = function(){

        if( $scope.token != "" )
        {
            var pollUrl = "https://events.voip.ovh.net/?token=" + $scope.token;

            if( $scope.session != "" )
            {
                pollUrl += "&session=" + $scope.session;
            }

            $scope.status = "Waiting on " + pollUrl;

            $.ajax({
                type: 'GET',
                dataType: "json",
                processData: false,
                crossDomain: true,
                jsonp: false,
                url: pollUrl,
                error: function ( r , textStatus, jqXHR) {
                    $scope.poll()
                },
                success: function ( r, textStatus, jqXHR) {
                    $scope.session = r.Session

                    for( i in r.Events )
                    {
                        // Sotre in last events
                        var eventType    = r.Events[i].Event
                        var eventData    = r.Events[i].Data
                        var eventDetails = r.Events[i].Details
                        console.log(r.Events[i]);

                        if (eventType != "registered") {
                            $scope.lastEvents.unshift(r.Events[i])
                        }

                        startDate = new Date( eventData.Ts * 1000);
                        startDate.setTime( startDate.getTime() + startDate.getTimezoneOffset()*-20*1000 );
                        eventData.DateStart = startDate

                        if (r.Events[i].Ressource && !eventData.Called)
                        {
                            eventData.Called = r.Events[i].Ressource;
                        }

                        if (r.Events[i].Ressource && !eventData.Calling)
                        {
                            eventData.Calling = r.Events[i].Ressource;
                        }

                        if ($scope.cgiSet && eventType == "start_ringing" || $scope.cgiSet && eventType == "member-queue-start")
                        {
                            var url = $scope.cgiPath;
                            url = url.replace("*CALLING*",eventData.Calling);                            
                            url = url.replace("*CALLED*",eventData.Called);                            
                            url = url.replace("*DIALED*",eventData.Dialed);                            
                            url = url.replace("*EVENT*",eventData.EventType);                            

                            if ($scope.cgiMode == 'modal')
                            {
                                $scope.url = url;
                                $('#myModal').modal({
                                    remote: url,
                                });
                               
                                $('#myModal').modal('show');
                            }
                            else if ($scope.cgiMode == 'popup')
                            {
                                window.open(url, 'myUrl');
                            }
                            else if ($scope.cgiMode == 'silent')
                            {
                                var request = new XMLHttpRequest();
                                request.open("GET", url, true);
                                request.send(null);
                            }
                        }

                        if( eventType == "start_ringing" ){
                            eventData.Status = "Ringing";
                            eventData.StatusTranslated = "Etablissement de l'appel";
                            $scope.liveEvent = eventData.StatusTranslated;
                            $scope.calls.push( eventData );
                        }
                        else if( eventType == "bridge-agent-failed" ){
                            $scope.memberCount = eventData.Count;
                            eventData.StatusTranslated = "Appel mis en queue ("+$scope.memberCount+")";
                        }
                        else if( eventType == "member-queue-start" ){
                            $scope.memberCount = eventData.Count;
                            eventData.Status = "Queued";
                            eventData.StatusTranslated = "Appel mis en queue ("+$scope.memberCount+")";
                            $scope.liveEvent = eventData.StatusTranslated;
                            $scope.calls.push( eventData );
                        }
                        else if( eventType == "end_ringing" ){
                            existingCall = $.grep( $scope.calls, function( existing, i ){
                                if( existing && eventData && existing.CallId == eventData.CallId )
                                {
                                    $scope.calls.splice(i, 1);
                                    eventData.Status = "Free";
                                    eventData.StatusTranslated = "Poste libre";
                                }
                            });
                        }
                        else if( eventType == "member-queue-end" ){
                            $scope.memberCount = eventData.Count;
                            eventData.StatusTranslated = "Appel mis en queue ("+$scope.memberCount+")";
                            $scope.liveEvent = eventData.StatusTranslated;
                            existingCall = $.grep( $scope.calls, function( existing, i ){
                                if( existing && eventData && existing.CallId == eventData.CallId )
                                {
                                    $scope.calls.splice(i, 1);
                                }
                            });
                        }
                        else if( eventType == "start_calling" ){
                            existingCall = $.grep( $scope.calls, function( existing ){
                                return existing.CallId == eventData.CallId
                            });

                            if(existingCall[0])
                            {
                                existingCall[0].Status = "Answered";
                                eventData.StatusTranslated = "Appel en cours";
                                $scope.liveEvent = eventData.StatusTranslated;
                            }
                            else
                            {
                                eventData.Status = "Answered";
                                eventData.StatusTranslated = "Appel en cours";
                                $scope.liveEvent = eventData.StatusTranslated;
                                $scope.calls.push( eventData );
                            }
                        }
                        else if( eventType == "end_calling" ){
                            existingCall = $.grep( $scope.calls, function( existing, i ){
                                if( existing && eventData && existing.CallId == eventData.CallId )
                                {
                                    eventData.Status = "Free";
                                    eventData.StatusTranslated = "Poste libre";
                                    $scope.calls.splice(i, 1);
                                }
                            });
                        }

                        if (!$scope.numbers[r.Events[i].Ressource] || ($scope.numbers[r.Events[i].Ressource]["status"] == "" || $scope.numbers[r.Events[i].Ressource]["status"] == "Wait" && !eventData.Status))
                        {
                            eventData.Status = "Free";
                            eventData.StatusTranslated = "Poste libre";
                        }

                        if (eventDetails.Type == "cloudHunting" || eventDetails.Type == "easyHunting") {
                            if (eventData.Count == 0) {
                                eventData.Status = "Free";
                                eventData.StatusTranslated = "File libre";
                            } else {
                                eventData.Status = "Queued";
                                eventData.StatusTranslated = "Appels en attente";
                            }
                        }


                        if (eventData.Status)
                        {
                            $scope.number = r.Events[i].Ressource;
                            if (!$scope.numbers[r.Events[i].Ressource]) {
                                $scope.numbers[r.Events[i].Ressource] = {};
                            }
                            $scope.numbers[r.Events[i].Ressource]["ressource"] = r.Events[i].Ressource;
                            $scope.numbers[r.Events[i].Ressource]["status"] = eventData.Status;
                            $scope.numbers[r.Events[i].Ressource]["statust"] = eventData.StatusTranslated;
                            $scope.numbers[r.Events[i].Ressource]["description"] = eventDetails.Description;
                            $scope.numbers[r.Events[i].Ressource]["simultaneous"] = eventDetails.SimultaneousLine;
                            $scope.numbers[r.Events[i].Ressource]["type"] = eventDetails.Type;

                            if (eventDetails.Type == "cloudHunting" || eventDetails.Type == "easyHunting") {
                                if (!$scope.numbers[r.Events[i].Ressource]["members"]) {
                                    $scope.numbers[r.Events[i].Ressource]["members"] = {}
                                }
    
                                if (!$scope.numbers[r.Events[i].Ressource]["queues"]) {
                                    $scope.numbers[r.Events[i].Ressource]["queues"] = {}
                                }

                                if (!$scope.numbers[r.Events[i].Ressource]["countanswered"]) {
                                    $scope.numbers[r.Events[i].Ressource]["countanswered"] = 0
                                }
                                
                                if (!$scope.numbers[r.Events[i].Ressource]["countlost"]) {
                                    $scope.numbers[r.Events[i].Ressource]["countlost"] = 0
                                }

                                //C'est une file d'appels
                                if (eventType == "bridge-agent-start") {
                                   $scope.numbers[r.Events[i].Ressource]["countanswered"]++
                                    var memberInfo = {}

                                    var re = /^agent_(\w+)_\d+$/;
                                    var agent = eventData.QueueAgent.replace(re, '$1'); 

                                    memberInfo["Calling"] = eventData.Calling
                                    memberInfo["QueueAgent"] = agent
                                    memberInfo["JoinedTime"] = eventData.QueueMemberJoinedTime
                                    memberInfo["Timer"] = 0
                                    memberInfo["QueueTimer"] = 0

                                    if ($scope.numbers[r.Events[i].Ressource]["queues"][eventData.QueueMemberUUID])
                                    {
                                        console.log("#"+eventData.QueueMemberUUID)
                                        memberInfo["QueueTimer"] = $("#q"+eventData.QueueMemberUUID).html();
                                        memberInfo["Datetime"] = $scope.numbers[r.Events[i].Ressource]["queues"][eventData.QueueMemberUUID]["Datetime"]
                                        delete $scope.numbers[r.Events[i].Ressource]["queues"][eventData.QueueMemberUUID]
                                    }

                                    $scope.numbers[r.Events[i].Ressource]["members"][eventData.QueueMemberUUID] = memberInfo
                                }

                                if (eventType == "bridge-agent-fail" && (eventData.QueueHangupCause == "ORIGINATOR_CANCEL" || eventData.QueueHangupCause == "NO_AGENT_TIMEOUT")) {
                                    $scope.numbers[r.Events[i].Ressource]["countlost"]++

                                    if ($scope.numbers[r.Events[i].Ressource]["queues"][eventData.QueueMemberUUID])
                                    {
                                        var historyHunting = {};
                                        historyHunting["datetime"] = $scope.numbers[r.Events[i].Ressource]["queues"][eventData.QueueMemberUUID]["Datetime"];
                                        historyHunting["hunting"] = r.Events[i].Ressource;
                                        historyHunting["huntingDesc"] = $scope.numbers[r.Events[i].Ressource]["description"]
                                        historyHunting["calling"] = $scope.numbers[r.Events[i].Ressource]["queues"][eventData.QueueMemberUUID]["Calling"];
                                        historyHunting["member"] = 0;
                                        historyHunting["queueTime"] = $("#q"+eventData.QueueMemberUUID).html();
                                        historyHunting["callTime"] = 0;

                                        $scope.lastHuntingEvents.push(historyHunting);
                                    
                                        delete $scope.numbers[r.Events[i].Ressource]["queues"][eventData.QueueMemberUUID]
                                    }
                                }
                                
                                if (eventType == "agent-offering") {
                                    var re = /^agent_(\w+)_\d+$/;
                                    var agent = eventData.QueueAgent.replace(re, '$1');
                                    $scope.numbers[r.Events[i].Ressource]["queues"][eventData.QueueMemberUUID]["QueueAgent"] = agent
                                }

                                if (eventType == "members-count") {
                                    $scope.numbers[r.Events[i].Ressource]["countqueue"] = eventData.Count
                                }

                                if (eventType == "bridge-agent-end") {
                                    if (!$scope.numbers[r.Events[i].Ressource]["averagewaiting"]) {
                                        $scope.numbers[r.Events[i].Ressource]["averagewaiting"] = 0
                                    }

                                    $scope.numbers[r.Events[i].Ressource]["averagewaiting"] = Math.round((($scope.numbers[r.Events[i].Ressource]["countanswered"] * $scope.numbers[r.Events[i].Ressource]["averagewaiting"]) + parseInt(eventData.QueueAgentAnsweredTime) - parseInt(eventData.QueueMemberJoinedTime)) / ($scope.numbers[r.Events[i].Ressource]["countanswered"] + 1),3)

                                    if ($scope.numbers[r.Events[i].Ressource]["members"][eventData.QueueMemberUUID]) {
                                        
                                        var historyHunting = {};
                                        historyHunting["datetime"] = $scope.numbers[r.Events[i].Ressource]["members"][eventData.QueueMemberUUID]["Datetime"];
                                        historyHunting["hunting"] = r.Events[i].Ressource
                                        historyHunting["huntingDesc"] = $scope.numbers[r.Events[i].Ressource]["description"]
                                        historyHunting["calling"] = $scope.numbers[r.Events[i].Ressource]["members"][eventData.QueueMemberUUID]["Calling"]
                                        historyHunting["member"] = $scope.numbers[r.Events[i].Ressource]["members"][eventData.QueueMemberUUID]["QueueAgent"]
                                        historyHunting["memberDesc"] = ""
                                        if ($scope.numbers[historyHunting["member"]] && $scope.numbers[historyHunting["member"]]["description"])
                                        {
                                            historyHunting["memberDesc"] = $scope.numbers[historyHunting["member"]]["description"]
                                        }
                                            
                                        historyHunting["queueTime"] = $scope.numbers[r.Events[i].Ressource]["members"][eventData.QueueMemberUUID]["QueueTimer"]
                                        historyHunting["callTime"] = $("#m"+eventData.QueueMemberUUID).html();

                                        $scope.lastHuntingEvents.push(historyHunting);
                                        
                                        delete $scope.numbers[r.Events[i].Ressource]["members"][eventData.QueueMemberUUID]
                                    }
                                    //CC-Bridge-Terminated-Time - CC-Agent-Answered-Time
                                    //CC-Agent-Answered-Time - CC-Member-Joined-Time
                                }

                                if (eventType == "member-queue-start") {

                                    var queueInfo = {}

                                    //var re = /^agent_(\w+)_\d+$/;
                                    //var agent = eventData.Calling.replace(re, '$1'); 

                                    queueInfo["Datetime"] = eventData.DateStart
                                    queueInfo["QueueAgent"] = "..."
                                    queueInfo["Calling"] = eventData.Calling
                                    queueInfo["JoinedTime"] = eventData.QueueMemberJoinedTime
                                    queueInfo["Timer"] = 0
                      
                                    $scope.numbers[r.Events[i].Ressource]["queues"][eventData.QueueMemberUUID] = queueInfo
                                }


                                if (eventType == "member-queue-end") {
                                    
                                }



                                $scope.numbers[r.Events[i].Ressource]["counttotal"] = parseInt($scope.numbers[r.Events[i].Ressource]["countanswered"]) + parseInt($scope.numbers[r.Events[i].Ressource]["countlost"])
                                $scope.numbers[r.Events[i].Ressource]["percentanswered"] = Math.round($scope.numbers[r.Events[i].Ressource]["countanswered"] * 100 / $scope.numbers[r.Events[i].Ressource]["counttotal"], 3)
                            } else {
                                var numberRunningCalls = $.grep( $scope.calls, function( existing ){
                                    return existing.Billing == eventData.Billing
                                })
                
                                $scope.numbers[r.Events[i].Ressource]["cursimultaneous"] = numberRunningCalls.length
                            }                           
 
                            var jsonNumbers = JSON.stringify($scope.numbers);
                            localStorage.setItem($scope.token + "-numbers", jsonNumbers)                    
                            $scope.numbersize = Object.keys($scope.numbers).length;
                        }

                        console.log($scope.numbers)
                        $scope.$apply()
                    }

                    $scope.poll()
                }
            });
        }
    };


    $scope.login = function (){
        $scope.notify = "";
        $scope.logged = true;
        setCookie('cookieToken',$scope.token, 15 * 60);

        if ($scope.keepConnectionActive)
        {
            localStorage.setItem("cookieToken",$scope.token);
        }

        $scope.hideSL = localStorage.getItem($scope.token + "-hideSL")
        $scope.reinitAuto = localStorage.getItem($scope.token + "-reinitAuto")
        $scope.cgiSet = localStorage.getItem($scope.token + "-cgiSet")
        $scope.cgiPath = localStorage.getItem($scope.token + "-cgiPath")
        if (localStorage.getItem($scope.token + "-numbers")) {
            $scope.numbers = JSON.parse(localStorage.getItem($scope.token + "-numbers"))
        }
        else
        {
            $scope.numbers = {};
        }        

        console.log($scope.numbers)
        for( i in $scope.numbers)
        { 
            $scope.numbers[i]["countqueue"] = "0";
            $scope.numbers[i]["status"] = "Wait";
            $scope.numbers[i]["statust"] = "...";
            $scope.numbers[i]["cursimultaneous"] = "undef";
            $scope.numbers[i]["members"] = {}
            $scope.numbers[i]["queues"] = {}
            $scope.numbersize = i;
        }

        $scope.cgiMode =localStorage.getItem($scope.token + "-cgiMode");
        $scope.poll();
    };


    if (gup("token"))
    {
        $scope.token = gup("token");
        $scope.login();
    }
    else if ($scope.token = localStorage.getItem('cookieToken'))
    {
        $scope.logged = true;
        $scope.login();
    }
    else
    {
        if ($scope.token = getCookie('cookieToken'))
        {
            $scope.logged = true;
            $scope.login();
        }
    }

    $scope.logout = function (){
        $scope.logged = false;
        setCookie('cookieToken','',0);
        $scope.token = '';
        $scope.page = false;
        $scope.pagename = "Vue d'ensemble";
        $scope.notify = "Vous avez été déconnecté."
        localStorage.setItem("cookieToken","");
    };

    $scope.changeToken = function (){
        $scope.login();
        $scope.notify = "Les paramètres du token ont été modifiés.";
    }

    $scope.changeCgi = function (page){
        localStorage.setItem($scope.token + "-cgiMode", $scope.cgiMode);
        localStorage.setItem($scope.token + "-cgiSet", $scope.cgiSet);
        localStorage.setItem($scope.token + "-cgiPath", $scope.cgiPath);
        $scope.notify = "Les paramètres du cgi ont été modifiés.";
    }

    $scope.changeOptions = function (page){
        localStorage.setItem($scope.token + "-hideSL", $scope.hideSL);
        localStorage.setItem($scope.token + "-reinitAuto", $scope.reinitAuto);
        $scope.notify = "Les options d'affichage ont été modifiées.";
    }

    $scope.reinit = function (page){
        var jsonNumbers = JSON.stringify({});
        localStorage.setItem($scope.token + "-numbers", jsonNumbers)
        $scope.notify = "Les options de cache ont été réinitialisées.";
        $scope.login();
    }



    //Page scope
    $scope.changePage = function (page){
        $scope.page = page;
        if ($scope.page == 'cgi')
        {
            $scope.pagename = "Configuration du CGI";
        }
        if ($scope.page == 'display')
        {
            $scope.pagename = "Configuration de l'affichage";
        }
        if ($scope.page == 'hunting')
        {
            $scope.pagename = "Vue des files d'appel";
        }
        if ($scope.page == 'token')
        {
            $scope.pagename = "Configuration du token";
        }
        if ($scope.page == 'help')
        {
            $scope.pagename = "Aide";
        }
        
        if ($scope.page == '')
        {
            $scope.pagename = "Vue d'ensemble";
        }
    }
    
//    $scope.poll()
});




function setCookie(cname, cvalue, exsecs) {
    var d = new Date();
    d.setTime(d.getTime() + (exsecs*1000));
    var expires = "expires="+d.toUTCString();
    document.cookie = cname + "=" + cvalue + "; " + expires;
}

function getCookie(cname) {
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for(var i=0; i<ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1);
        if (c.indexOf(name) != -1) return c.substring(name.length, c.length);
    }
    return "";
}

