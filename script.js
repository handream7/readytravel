// Firebase 구성 (사용자의 정보를 입력하세요)
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_ID",
    appId: "YOUR_APP_ID"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

let currentUser = '강민성';
let currentTravel = 'first';

// 상태 순환: X -> △ -> O -> X
const statusCycle = { 'X': '△', '△': 'O', 'O': 'X' };

function switchUser(user) {
    currentUser = user;
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.innerText === user);
    });
    loadData();
}

function addNewTravel() {
    const name = prompt("새 여행 이름을 입력하세요:");
    if (name) {
        const select = document.getElementById('travelSelect');
        const option = document.createElement('option');
        option.value = name;
        option.text = name;
        select.add(option);
        select.value = name;
        currentTravel = name;
        loadData();
    }
}

function addCategory() {
    const category = prompt("새 카테고리 이름:");
    if (!category) return;
    const ref = database.ref(`travels/${currentTravel}/${currentUser}/${category}`);
    ref.set({ _isCategory: true });
}

function addItem() {
    const category = prompt("어느 카테고리에 추가할까요?");
    const itemName = prompt("아이템 이름:");
    if (!category || !itemName) return;
    
    database.ref(`travels/${currentTravel}/${currentUser}/${category}/${itemName}`).set({
        prep_out: 'X',
        done_out: 'X',
        prep_in: 'X',
        done_in: 'X'
    });
}

function updateStatus(category, item, field, currentVal) {
    const nextVal = statusCycle[currentVal];
    database.ref(`travels/${currentTravel}/${currentUser}/${category}/${item}/${field}`).set(nextVal);
}

function deleteItem(category, item) {
    if(confirm('삭제하시겠습니까?')) {
        database.ref(`travels/${currentTravel}/${currentUser}/${category}/${item}`).remove();
    }
}

function loadData() {
    currentTravel = document.getElementById('travelSelect').value;
    const ref = database.ref(`travels/${currentTravel}/${currentUser}`);
    
    ref.on('value', (snapshot) => {
        const data = snapshot.val();
        const tbody = document.getElementById('checklistBody');
        tbody.innerHTML = '';

        if (!data) return;

        for (let category in data) {
            // 카테고리 행
            const catRow = `<tr class="category-row"><td colspan="6">${category}</td></tr>`;
            tbody.innerHTML += catRow;

            for (let item in data[category]) {
                if (item === '_isCategory') continue;
                const vals = data[category][item];
                const row = `
                    <tr>
                        <td>${item}</td>
                        <td><button class="status-btn status-${vals.prep_out}" onclick="updateStatus('${category}', '${item}', 'prep_out', '${vals.prep_out}')">${vals.prep_out}</button></td>
                        <td><button class="status-btn status-${vals.done_out}" onclick="updateStatus('${category}', '${item}', 'done_out', '${vals.done_out}')">${vals.done_out}</button></td>
                        <td><button class="status-btn status-${vals.prep_in}" onclick="updateStatus('${category}', '${item}', 'prep_in', '${vals.prep_in}')">${vals.prep_in}</button></td>
                        <td><button class="status-btn status-${vals.done_in}" onclick="updateStatus('${category}', '${item}', 'done_in', '${vals.done_in}')">${vals.done_in}</button></td>
                        <td><button onclick="deleteItem('${category}', '${item}')">삭제</button></td>
                    </tr>
                `;
                tbody.innerHTML += row;
            }
        }
    });
}

// 초기 로딩
loadData();