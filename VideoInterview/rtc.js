"use strict";

let localVideo = document.getElementById("localVideo");
let remoteVideo = document.getElementById("remoteVideo");
let isInitiator = false;
let isChannelReady = false;
let isStarted = false;
let localStream;
let remoteStream;
let pc;

// 녹화 셋
let log = console.log.bind(console),
  id = val => document.getElementById(val),
  ul = id('ul'),
  start = id('start'),
  stop = id('stop'),
  stream,
  recorder,
  counter=1,
  chunks,
  media;

let pcConfig = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302",
    },
  ],
};

let room = "foo";

let socket = io.connect();

if (room !== "") {
  socket.emit("create or join", room);
  console.log("Attempted to create or join Room", room);
}

socket.on("created", (room, id) => {
  console.log("Created room" + room + "socket ID : " + id);
  isInitiator = true;
});

socket.on("full", (room) => {
  console.log("Room " + room + "is full");
});

socket.on("join", (room) => {
  console.log("Another peer made a request to join room" + room);
  console.log("This peer is the initiator of room" + room + "!");
  isChannelReady = true;
});

socket.on("joined", (room) => {
  console.log("joined : " + room);
  isChannelReady = true;
});
socket.on("log", (array) => {
  console.log.apply(console, array);
  
});

socket.on("message", (message) => {

  console.log("Client received message :", message);
  if (message === "got user media") {
    maybeStart();
  } else if (message.type === "offer") {
    if (!isInitiator && !isStarted) {
      maybeStart();
    }
    pc.setRemoteDescription(new RTCSessionDescription(message));
    doAnswer();
  } else if (message.type === "answer" && isStarted) {
    pc.setRemoteDescription(new RTCSessionDescription(message));
  } else if (message.type === "candidate" && isStarted) {
    const candidate = new RTCIceCandidate({
      sdpMLineIndex: message.label,
      candidate: message.candidate,
    });

    pc.addIceCandidate(candidate);
  }
});
function sendMessage(message) {
  console.log("Client sending message: ", message);
  socket.emit("message", message);
}

// 이거
  let mediaOptions = {
      video: {
        tag: 'video',
        type: 'video/webm',
        ext: '.mp4',
        gUM: {
          video: true,
          audio: {
            autoGainControl: false,
            channelCount: 2,
            echoCancellation: false,
            latency: 0,
            noiseSuppression: false,
            sampleRate: 48000,
            sampleSize: 16,
            volume: 1.0,
          },
        }
      }
    };

navigator.mediaDevices
  .getUserMedia(mediaOptions.video.gUM)
  .then(_stream => {stream=_stream;
    gotStream(stream);
    recorder = new MediaRecorder(stream);
    recorder.ondataavailable = e => {
      chunks.push(e.data);
      if(recorder.state == 'inactive')  makeLink();
    };
    log('got media successfully');
  })
  .catch((error) => console.error(error));


function gotStream(stream) {
  console.log("Adding local stream");
  localStream = stream;
  localVideo.srcObject = stream;
  sendMessage("got user media");
  if (isInitiator) {
    maybeStart();
  }
}

function createPeerConnection() {
  try {
    pc = new RTCPeerConnection(null);
    pc.onicecandidate = handleIceCandidate;
    pc.onaddstream = handleRemoteStreamAdded;
    console.log("Created RTCPeerConnection");
  } catch (e) {
    alert("connot create RTCPeerConnection object");
    return;
  }
}

function handleIceCandidate(event) {
  console.log("iceCandidateEvent", event);
  if (event.candidate) {
    sendMessage({
      type: "candidate",
      label: event.candidate.sdpMLineIndex,
      id: event.candidate.sdpMid,
      candidate: event.candidate.candidate,
    });
  } else {
    console.log("end of candidates");
  }
}

function handleCreateOfferError(event) {
  console.log("createOffer() error: ", event);
}

function handleRemoteStreamAdded(event) {
  console.log("remote stream added");
  remoteStream = event.stream;
  remoteVideo.srcObject = remoteStream;
}

function maybeStart() {
  console.log(">>MaybeStart() : ", isStarted, localStream, isChannelReady);
  if (!isStarted && typeof localStream !== "undefined" && isChannelReady) {
    console.log(">>>>> creating peer connection");
    createPeerConnection();
    pc.addStream(localStream);
    isStarted = true;
    console.log("isInitiator : ", isInitiator);
    if (isInitiator) {
      doCall();
    }
  } else {
    console.error("maybeStart not Started!");
  }
}

function doCall() {
  console.log("Sending offer to peer");
  pc.createOffer(setLocalAndSendMessage, handleCreateOfferError);
}

function doAnswer() {
  console.log("Sending answer to peer");
  pc.createAnswer().then(
    setLocalAndSendMessage,
    onCreateSessionDescriptionError
  );
}

function setLocalAndSendMessage(sessionDescription) {
  pc.setLocalDescription(sessionDescription);
  sendMessage(sessionDescription);
}

function onCreateSessionDescriptionError(error) {
  console.error("Falied to create session Description", error);
}

// 녹화기능 구현

start.onclick = e => {
  console.log('시작했다')
  start.disabled = true;
  stop.removeAttribute('disabled');
  chunks=[];
  recorder.start();
}


stop.onclick = e => {
  stop.disabled = true;
  recorder.stop();
  start.removeAttribute('disabled');
}

    function makeLink(){
      let blob = new Blob(chunks, {type: 'video/webm' })
        , url = URL.createObjectURL(blob)
        , li = document.createElement('li')
        , mt = document.createElement('video')
        , hf = document.createElement('a')
      ;
      mt.controls = true;
      mt.src = url;
      hf.href = url;
      hf.download = `${counter++}${'.webm'}`;
      hf.innerHTML = `donwload ${hf.download}`;
      li.appendChild(mt);
      li.appendChild(hf);
      ul.appendChild(li);
    }