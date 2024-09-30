const video = document.getElementById('video');
let mediaRecorder;
let recordedChunks = [];
let angleData = [];

// カメラにアクセスして、映像をvideoタグに表示
async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    
    // MediaRecorderを初期化
    mediaRecorder = new MediaRecorder(stream);
    
    mediaRecorder.ondataavailable = function(event) {
      if (event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };
  } catch (error) {
    console.error('カメラアクセスに失敗しました:', error);
  }
}

startCamera();

function startRecording() {
    mediaRecorder.start();
    document.getElementById('startRecording').disabled = true;
    document.getElementById('stopRecording').disabled = false;
  
    // コンパスの権限をリクエストし、角度の記録を開始
    requestPermission();
}
  
function stopRecording() {
    mediaRecorder.stop();
    window.removeEventListener('deviceorientation', recordAngle);
    
    document.getElementById('startRecording').disabled = false;
    document.getElementById('stopRecording').disabled = true;
  
    saveRecording();
}
  
// コンパス角度を記録
function recordAngle(event) {
    const alpha = event.alpha;  // デバイスが向いている方角
    const timestamp = Date.now();
    angleData.push({ timestamp, alpha });
}

  
function saveRecording() {
    const videoBlob = new Blob(recordedChunks, { type: 'video/mp4' });
    const videoUrl = URL.createObjectURL(videoBlob);
    
    // 動画のダウンロードリンクを作成
    const downloadLink = document.createElement('a');
    downloadLink.href = videoUrl;
    downloadLink.download = 'recording.mp4';
    downloadLink.click();
    
    saveAngleData();
}

function saveAngleData() {
    const angleBlob = new Blob([JSON.stringify(angleData)], { type: 'application/json' });
    const angleUrl = URL.createObjectURL(angleBlob);
    
    // JSONのダウンロードリンクを作成
    const downloadLink = document.createElement('a');
    downloadLink.href = angleUrl;
    downloadLink.download = 'angles.json';
    downloadLink.click();
}

function requestPermission() {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      DeviceOrientationEvent.requestPermission()
        .then(permissionState => {
          if (permissionState === 'granted') {
            window.addEventListener('deviceorientation', recordAngle);
          } else {
            console.log('Permission to access device orientation was denied');
          }
        })
        .catch(console.error);
    } else {
      // 権限リクエストが不要なブラウザの場合
      window.addEventListener('deviceorientation', recordAngle);
    }
}  
  
document.getElementById('startRecording').addEventListener('click', startRecording);
document.getElementById('stopRecording').addEventListener('click', stopRecording);