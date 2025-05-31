function IndexedDB(param){

    function constructor(){
        // IndexedDB 연결 열기
        const openDB = indexedDB.open(param.dbNm, param.dbVersion);

        // 데이터베이스가 처음 생성될 때 호출 (스키마 설정)
        openDB.onupgradeneeded = function (event) {
            const db = event.target.result;

            // Object Store 생성
            if (!db.objectStoreNames.contains(param.tableNm)) {
                db.createObjectStore(param.tableNm, { keyPath: param.key }); // id를 키로 사용
            }
        };
    }

    constructor();

    this.query = (cmd, value, opt) => {
        const cmds = 'crud-bomi'; //- 하이픈은 안씀, b는 backup, o는 overwrite, m은 multiUpdate, i는 initData

        if(cmd.length !== 1 || cmds.indexOf(cmd) < 0) return;

        const openDB = indexedDB.open(param.dbNm, param.dbVersion);

        openDB.onsuccess = function (event) {
            const db = event.target.result;

            const transaction = db.transaction(param.tableNm, 'readwrite');
            const store = transaction.objectStore(param.tableNm);

            let cmdRequest;

            if(cmd === 'c'){

            }else if(cmd === 'r'){
                // if(typeof value !== 'string' && value !== undefined) return;
                if(typeof value === 'string'){  //단순 조회
                    cmdRequest = store.get(value);
    
                    cmdRequest.onsuccess = function () {
                        const data = cmdRequest.result;
                        if(opt && typeof opt.success === 'function') opt.success(data, value);
                    };
    
                    cmdRequest.onerror = function () {
                        console.error("데이터 가져오기 실패");
                    };
                }else if(value === undefined && opt && opt.where){  //where조건 느낌

                    const filteredData = [];
                    cmdRequest = store.openCursor();
                    cmdRequest.onsuccess = function (event) {
                        const cursor = event.target.result;
                        if (cursor) {
                            const data = cursor.value;
                            if (opt.where(data)) {  // 조건에 확인
                                filteredData.push(data);
                            }
                            cursor.continue(); // 다음 데이터로 이동
                        } else {    //모든 데이터를 순회하면
                            if(opt && typeof opt.success === 'function'){
                                opt.success(filteredData);
                            }
                        }
                    };
                }

            }else if(cmd === 'u'){
                if(!value || !value[param.key]) return;

                cmdRequest = store.get(value[param.key]);

                cmdRequest.onsuccess = function () {
                    const data = cmdRequest.result;

                    if (data) {
                        // 기존 데이터를 수정
                        const updatedRecord = { ...data, ...value };
                        const updateRequest = store.put(updatedRecord);

                        updateRequest.onsuccess = function () {
                            console.log(`ID ${value[param.key]} 데이터 수정 완료`);
                            if(opt && typeof opt.success === 'function'){
                                opt.success(value[param.key]);
                            }
                        };

                        updateRequest.onerror = function () {
                            console.error(`ID ${value[param.key]} 데이터 수정 실패`);
                        };
                    } else {
                        console.log(`ID ${value[param.key]} 데이터 없음`);

                        if(opt && opt.upsert === true){
                            console.log(value);
                            const insertRequest = store.put(value);
                            insertRequest.onsuccess = function () {
                                console.log(`ID ${value[param.key]} 데이터 등록 완료`);
                                if(opt && typeof opt.success === 'function'){
                                    opt.success(value[param.key]);
                                }
                            };
    
                            insertRequest.onerror = function () {
                                console.error(`ID ${value[param.key]} 데이터 등록 실패`);
                            };
                        }
                    }
                };
    
                cmdRequest.onerror = function () {
                    console.error(`ID ${value[param.key]} 데이터 처리 실패`);
                };

            }else if(cmd === 'd'){
                if(typeof value !== 'string') return;

                cmdRequest = store.delete(value);
                cmdRequest.onsuccess = function () {
                    console.log(`ID ${value} 데이터 삭제 완료`);
                    if(opt && typeof opt.success === 'function'){
                        opt.success(value);
                    }
                };
    
                cmdRequest.onerror = function () {
                    console.error(`ID ${value} 데이터 삭제 실패`);
                };
            }else if(cmd === 'b'){
                cmdRequest = store.openCursor();
                const allData = [];

                cmdRequest.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        allData.push(cursor.value); // 필요한 데이터 수집
                        cursor.continue(); // 다음으로 이동
                    } else {
                        // 다 모았으면 파일로 저장
                        const json = JSON.stringify(allData, null, 2);
                        const blob = new Blob([json], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);

                        const a = document.createElement('a');
                        a.href = url;
                        // a.download = 'backup.json';
                        a.download = createFileName();
                        a.style.display = 'none';
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        URL.revokeObjectURL(url);

                        console.log('백업 완료!');
                    }
                };

                cmdRequest.onerror = () => {
                    console.error("커서 순회 중 오류 발생");
                };
            }else if(cmd === 'o'){

                cmdRequest = store.openCursor();
                const allData = [];

                cmdRequest.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        allData.push(cursor.value); // 필요한 데이터 수집
                        cursor.continue(); // 다음으로 이동
                    } else {
                        if(opt && typeof opt.success === 'function') opt.success(allData);
                    }
                };

                cmdRequest.onerror = () => {
                    console.error("커서 순회 중 오류 발생");
                };

            }else if(cmd === 'i'){
                cmdRequest = store.clear();  // 이게 전체 데이터 삭제

                cmdRequest.onsuccess = () => {
                    console.log('스토어 데이터 전체 삭제 완료');
                    if(opt && typeof opt.success === 'function'){
                        opt.success();
                    }
                    db.close();
                };

                cmdRequest.onerror = (e) => {
                    console.error('스토어 데이터 삭제 실패', e.target.error);
                    db.close();
                };
            }else if(cmd === 'm'){
                value.forEach(item => {
                    store.put(item); // 또는 store.add(item)
                });

                transaction.oncomplete = () => {
                    console.log('모든 데이터 저장 완료!');

                    if(opt && typeof opt.success === 'function'){
                        opt.success();
                    }
                    
                    db.close();
                };

                transaction.onerror = (event) => {
                    console.error('트랜잭션 에러:', event.target.error);
                };

            }

        };
    }
      
    function createFileName(){
        const now = new Date();

        const pad = (n) => n.toString().padStart(2, '0');

        const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
        const timeStr = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

        const filename = `backup_${dateStr}_${timeStr}.json`;

        return filename;
    }
}