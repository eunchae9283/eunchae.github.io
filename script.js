document.addEventListener('DOMContentLoaded', () => {
  const video = document.getElementById('webcam');
  const filterCanvas = document.getElementById('filterCanvas');
  const filterContext = filterCanvas.getContext('2d');
  let selectedFilterImage = null;
  let faceApi;
  let filterImage = new Image();
  let photoWindow = null; // 두 번째 창을 관리할 변수

  // 1. 웹캠 설정
  navigator.mediaDevices.getUserMedia({ video: true })
    .then((stream) => {
      video.srcObject = stream;
      video.onloadedmetadata = () => {
        video.play();
        video.width = video.videoWidth;
        video.height = video.videoHeight;
        filterCanvas.width = video.width;
        filterCanvas.height = video.height;
        initializeFaceApi();
      };
    })
    .catch((error) => {
      console.error("웹캠 접근 실패:", error);
    });

  // 2. 필터 선택 함수
  window.selectFilter = function(filterSrc) {
    filterImage.src = filterSrc;
    filterImage.onload = () => {
      console.log("필터 이미지가 로드되었습니다.");
    };
  };

  // 3. 얼굴 인식 초기화
  function initializeFaceApi() {
    faceApi = ml5.faceApi(video, { withLandmarks: true, withDescriptors: false }, modelLoaded);
  }

  function modelLoaded() {
    console.log("얼굴 인식 모델이 로드되었습니다.");
    detectFaces();
  }

  // 4. 얼굴 감지 및 필터 적용
  function detectFaces() {
    faceApi.detect((err, results) => {
      if (err) {
        console.error("얼굴 감지 오류:", err);
        return;
      }

      filterContext.clearRect(0, 0, filterCanvas.width, filterCanvas.height);

      if (results && results.length > 0 && filterImage.complete) {
        const face = results[0].landmarks;
        const leftEye = face.getLeftEye();
        const rightEye = face.getRightEye();

        if (leftEye && rightEye) {
          const eyeWidth = rightEye[0]._x - leftEye[0]._x;
          const filterWidth = eyeWidth * 2;
          const filterHeight = (filterWidth / filterImage.width) * filterImage.height;
          const filterX = leftEye[0]._x - eyeWidth / 2;
          const filterY = leftEye[0]._y - filterHeight / 2;

          filterContext.drawImage(filterImage, filterX, filterY, filterWidth, filterHeight);
        }
      }

      requestAnimationFrame(detectFaces);
    });
  }

  // 5. 사진 촬영 및 두 번째 창에 랜덤 위치로 추가
  window.capturePhoto = function() {
    const captureCanvas = document.createElement('canvas');
    const captureContext = captureCanvas.getContext('2d');
    captureCanvas.width = video.videoWidth;
    captureCanvas.height = video.videoHeight;
    captureContext.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);
    captureContext.drawImage(filterCanvas, 0, 0); // 필터 캔버스를 포함하여 캡처

    const imageData = captureCanvas.toDataURL('image/png');

    // 두 번째 창에 사진 추가
    if (photoWindow && !photoWindow.closed) {
      const img = photoWindow.document.createElement('img');
      img.src = imageData;
      img.style.width = '300px'; // 사진 크기를 설정
      img.style.position = 'absolute'; // 절대 위치 지정
      img.style.top = `${Math.random() * (photoWindow.innerHeight - 150)}px`; // 랜덤한 top 위치
      img.style.left = `${Math.random() * (photoWindow.innerWidth - 150)}px`; // 랜덤한 left 위치
      img.style.zIndex = Date.now(); // 가장 위에 위치하도록 z-index 설정

      photoWindow.document.body.appendChild(img);
    } else {
      // 두 번째 창이 없거나 닫힌 경우 새로 엽니다
      photoWindow = window.open('', 'PhotoWindow', 'width=800,height=600');
      photoWindow.document.write(`
        <html>
          <head>
            <title>Captured Photos</title>
            <style>
              body { margin: 0; position: relative; overflow: hidden; }
              img { position: absolute; }
            </style>
          </head>
          <body></body>
        </html>
      `);
    }
  };
});
