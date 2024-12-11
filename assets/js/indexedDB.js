function IndexedDB(param){
    this.param2 = param;

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
        const cmds = 'crud';

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
                        if (data) {
                            // console.log(`ID ${value} 데이터:`, data);
                            if(opt && typeof opt.success === 'function'){
                                opt.success(data, value);
                            }
                        } else {
                            console.log(`ID ${value} 데이터가 없습니다.`);
                        }
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
                        if(opt && opt.upsert === true) store.put(value);
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
            }

        };
    }
}