const video = document.getElementById('video');
let mediaRecorder;
let recordedChunks = [];
let angleData = [];

// カメラにアクセスして、映像をvideoタグに表示
function startCamera() {
    navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
        video.srcObject = stream;
      
        // MediaRecorderを初期化
        mediaRecorder = new MediaRecorder(stream);
      
        // 録画データを収集
        mediaRecorder.ondataavailable = function(event) {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };
      
        // 録画停止時にsaveRecordingを呼び出す
        mediaRecorder.onstop = function() {
            addLog("Recording has stopped. Saving the recording...");
            saveRecording();
        };
    }).catch(error => {
        console.error('カメラアクセスに失敗しました:', error);
        addLog("Failed to access the camera: " + error);
    });
  }

startCamera();

function startRecording() {
    addLog("Recording started");
    mediaRecorder.start();
    document.getElementById('startRecording').disabled = true;
    document.getElementById('stopRecording').disabled = false;
  
    // コンパスの権限をリクエストし、角度の記録を開始
    requestPermission();
}
  
function stopRecording() {
    addLog("Stopping the recording...");
    
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();  // これで録画を停止し、onstopが呼ばれる
    } else {
      addLog("MediaRecorder is not active.");
    }
  
    window.removeEventListener('deviceorientation', recordAngle);
  
    document.getElementById('startRecording').disabled = false;
    document.getElementById('stopRecording').disabled = true;
}  
  
  
// コンパス角度を記録
function recordAngle(event) {
    const alpha = event.alpha;  // デバイスが向いている方角
    
    // デバッグ用: HTML要素に角度を出力して、値が取得されているか確認
    addLog("Alpha: " + alpha);
    
    if (alpha !== null) {
      const timestamp = Date.now();
      angleData.push({ timestamp, alpha });
    }
}
  

  
function saveRecording() {
    addLog("Saving recording...");

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
            addLog("Permission granted for device orientation");
            window.addEventListener('deviceorientation', recordAngle);
          } else {
            addLog('Permission to access device orientation was denied');
          }
        })
        .catch(error => {
          addLog("Error while requesting permission: " + error);
        });
    } else {
      // 権限リクエストが不要なブラウザの場合
      addLog("DeviceOrientationEvent.requestPermission is not needed.");
      window.addEventListener('deviceorientation', recordAngle);
    }
}

// ログ出力用関数
function addLog(message) {
    const logList = document.getElementById('log-list');
    const newLog = document.createElement('li');
    newLog.textContent = message;
    logList.appendChild(newLog);
}
  
document.getElementById('startRecording').addEventListener('click', startRecording);
document.getElementById('stopRecording').addEventListener('click', stopRecording);

mediaRecorder.onstop = function() {
    addLog("Recording has stopped.");
    saveRecording();  // 録画が停止したら動画を保存
};
  
mediaRecorder.ondataavailable = function(event) {
    if (event.data.size > 0) {
      addLog("Recording chunk received.");
      recordedChunks.push(event.data);
    }
};  