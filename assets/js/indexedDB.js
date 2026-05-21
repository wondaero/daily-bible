function IndexedDB(param){
    let db;

    const queryObj = {
        c: function(value, opt, transaction, store){
        },
        r: function(value, opt, transaction, store){
            // if(typeof value !== 'string' && value !== undefined) return;
            if(typeof value === 'string'){  //단순 조회
                const cmdRequest = store.get(value);

                cmdRequest.onsuccess = function () {
                    const data = cmdRequest.result;
                    if(opt && typeof opt.success === 'function') opt.success(data, value);
                };

                cmdRequest.onerror = function () {
                    console.error("데이터 가져오기 실패");
                };
            }else if(value === undefined && opt && opt.where){  //where조건 느낌
                const filteredData = [];
                const cmdRequest = store.openCursor();
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
        },
        u: function(value, opt, transaction, store){
            if(!value || !value[param.key]) return;

            const cmdRequest = store.get(value[param.key]);

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
        },
        d: function(value, opt, transaction, store){
            if(typeof value !== 'string') return;

            const cmdRequest = store.delete(value);
            cmdRequest.onsuccess = function () {
                console.log(`ID ${value} 데이터 삭제 완료`);
                if(opt && typeof opt.success === 'function'){
                    opt.success(value);
                }
            };

            cmdRequest.onerror = function () {
                console.error(`ID ${value} 데이터 삭제 실패`);
            };
        },
        b: function(value, opt, transaction, store){
            const cmdRequest = store.openCursor();
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
        },
        o: function(value, opt, transaction, store){
            const cmdRequest = store.openCursor();
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
        },
        i: function(value, opt, transaction, store){
            const cmdRequest = store.clear();  // 이게 전체 데이터 삭제

            cmdRequest.onsuccess = () => {
                console.log('스토어 데이터 전체 삭제 완료');
                if(opt && typeof opt.success === 'function'){
                    opt.success();
                }
            };

            cmdRequest.onerror = (e) => {
                console.error('스토어 데이터 삭제 실패', e.target.error);
            };
        },
        m: function(value, opt, transaction, store){
            value.forEach(item => {
                store.put(item); // 또는 store.add(item)
            });

            transaction.oncomplete = () => {
                console.log('모든 데이터 저장 완료!');

                if(opt && typeof opt.success === 'function'){
                    opt.success();
                }
            };

            transaction.onerror = (event) => {
                console.error('트랜잭션 에러:', event.target.error);
            };
        },
    };

    (function constructor(){
        // IndexedDB 연결 열기
        const openDB = indexedDB.open(param.dbNm, param.dbVersion);

        // 데이터베이스가 처음 생성될 때 호출 (스키마 설정)
        openDB.onupgradeneeded = function (event) {
            const tempDB = event.target.result;

            // Object Store 생성
            if (!tempDB.objectStoreNames.contains(param.tableNm)) {
                tempDB.createObjectStore(param.tableNm, { keyPath: param.key }); // id를 키로 사용
            }else{
                //indexedDB 업데이트 사항들 적용
                migrate(event, param);
            }

        };
        
        openDB.onsuccess = function(event) {
            db = event.target.result;  // ← 여기서 바깥 let db에 저장
        };
        openDB.onerror = function(event) {
            console.error('DB 연결 실패', event.target.errror);
        };
    })();

    this.query = (cmd, value, opt) => {
        if(!db) return;

        const cmds = 'crud-bomi'; //- 하이픈은 안씀, b는 backup, o는 overwrite, m은 multiUpdate, i는 initData

        if(cmd.length !== 1 || cmds.indexOf(cmd) < 0) return;

        const isRead = cmd === 'r';
        const transaction = db.transaction(param.tableNm, isRead ? 'readonly' : 'readwrite');
        const store = transaction.objectStore(param.tableNm);

        if(typeof queryObj[cmd] === 'function') queryObj[cmd](value, opt, transaction, store);

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