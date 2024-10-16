const video = document.getElementById('video');
const requestButton = document.getElementById('requestPermission');
const startButton = document.getElementById('startRecording');
const stopButton = document.getElementById('stopRecording');
const table = document.getElementById('recordingsTable').getElementsByTagName('tbody')[0];
const logList = document.getElementById('log-list');

requestButton.addEventListener('click', requestPermission);
startButton.addEventListener('click', startRecording);
stopButton.addEventListener('click', stopRecording);

let mediaRecorder;
let recordedChunks = [];
let angleData = [];

function initialize() {

    addLog("Initializing the app...");

    // カメラにアクセスして、映像をvideoタグに表示
    navigator.mediaDevices.getUserMedia({
        video: {
            facingMode: { exact: "environment" },  // リアカメラを指定
            width: { ideal: 1920 },  // 1080pに対応する解像度を指定
            height: { ideal: 1080 }
        }
    }).then(stream => {
        video.srcObject = stream;

        // MediaRecorderを初期化
        mediaRecorder = new MediaRecorder(stream);
      
        // 録画データを収集
        mediaRecorder.ondataavailable = function(event) {
            recordedChunks.push(event.data);
            angleData.push(getAngle());
        };
    }).catch(error => {
        addLog("Failed to access the camera: " + error);
    });

    addLog("App initialized.");
}

initialize();

// デバイスの向きを取得するための権限をリクエスト
function requestPermission() {

    addLog("Requesting permission for device orientation...");

    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
        .then(permissionState => {
            if (permissionState === 'granted') {
                addLog("Permission granted for device orientation");
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
    }

    // 録画開始ボタンを有効にする
    startButton.disabled = false;
}

// 録画の開始
function startRecording() {

    addLog("Starting the recording...");

    // データを初期化
    recordedChunks = [];
    angleData = [];

    addLog("Data initialized.");
  
    // 録画を開始
    mediaRecorder.start();

    // 録画開始・停止ボタンの有効・無効を切り替え
    startButton.disabled = true;
    stopButton.disabled = false;

    addLog("Recording started.");
}

// 録画の停止
function stopRecording() {

    addLog("Stopping the recording...");
  
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();  // 録画停止
        addLog("Recording stopped.");
    } else {
        addLog("MediaRecorder is not active.");
    }
  
    // 録画開始・停止ボタンの有効・無効を切り替え
    startButton.disabled = false;
    stopButton.disabled = true;

    // データの保存とリンク生成
    saveRecordingAndAngles();  
} 
 
// コンパス角度を取得する関数
function getAngle() {
    let currentAngle;
    window.addEventListener('deviceorientation', function(event) {
        currentAngle = {
            timestamp: new Date().getTime(),
            alpha: event.alpha,
            beta: event.beta,
            gamma: event.gamma
        };
    });
    return currentAngle;
}
  
function addRecordingRow(videoUrl, jsonUrl, timestamp) {

    const newRow = table.insertRow();
  
    // 録画日時
    const dateCell = newRow.insertCell(0);
    dateCell.textContent = timestamp;
  
    // 動画のダウンロードリンク
    const videoCell = newRow.insertCell(1);
    const videoLink = document.createElement('a');
    videoLink.href = videoUrl;
    videoLink.textContent = '動画をダウンロード';
    videoLink.download = `recording_${timestamp.replace(/[: ]/g, '-')}.mp4`;
    videoCell.appendChild(videoLink);
  
    // 角度記録のダウンロードリンク
    const jsonCell = newRow.insertCell(2);
    const jsonLink = document.createElement('a');
    jsonLink.href = jsonUrl;
    jsonLink.textContent = '角度記録をダウンロード';
    jsonLink.download = `angles_${timestamp.replace(/[: ]/g, '-')}.json`;
    jsonCell.appendChild(jsonLink);
}


function saveRecordingAndAngles() {

    addLog("Saving the recording and angle data...");

    // 動画データをBlobに変換
    const videoBlob = new Blob(recordedChunks, { type: 'video/mp4' });
    const videoUrl = URL.createObjectURL(videoBlob);

    // 角度データをBlobに変換
    const jsonBlob = new Blob([JSON.stringify(angleData)], { type: 'application/json' });
    const jsonUrl = URL.createObjectURL(jsonBlob);

    // 表に新しい行を追加
    addRecordingRow(videoUrl, jsonUrl, new Date().toLocaleString());

    // ログ追加
    addLog("Recording and angle data added to table.");
}

// ログ出力用関数
function addLog(message) {
    const newLog = document.createElement('li');
    newLog.textContent = message;
    logList.appendChild(newLog);
}