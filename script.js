import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getDatabase, ref, set, onValue, remove } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyCvwQgyakS9eh9R0TYRODmc5EXJAoCbtAc",
    authDomain: "readytravel-f4e1c.firebaseapp.com",
    databaseURL: "https://readytravel-f4e1c-default-rtdb.firebaseio.com",
    projectId: "readytravel-f4e1c",
    storageBucket: "readytravel-f4e1c.firebasestorage.app",
    messagingSenderId: "772163379284",
    appId: "1:772163379284:web:ad9285538cf9d61c8f8dc1",
    measurementId: "G-7WBH433JKG"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

let currentUser = '강민성';
let currentTravel = 'first';
const statusCycle = { 'X': '△', '△': 'O', 'O': 'X' };

// 함수들을 전역(window) 객체에 할당 (HTML 버튼에서 호출 가능하도록)
window.switchUser = (user) => {
    currentUser = user;
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.innerText === user);
    });
    loadData();
};

window.addNewTravel = () => {
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
};

window.addCategory = () => {
    const category = prompt("새 카테고리 이름:");
    if (!category) return;
    set(ref(database, `travels/${currentTravel}/${currentUser}/${category}`), {
        _isCategory: true
    });
};

window.addItem = () => {
    const category = prompt("어느 카테고리에 추가할까요?");
    const itemName = prompt("아이템 이름:");
    if (!category || !itemName) return;
    
    set(ref(database, `travels/${currentTravel}/${currentUser}/${category}/${itemName}`), {
        prep_out: 'X',
        done_out: 'X',
        prep_in: 'X',
        done_in: 'X'
    });
};

window.updateStatus = (category, item, field, currentVal) => {
    const nextVal = statusCycle[currentVal];
    set(ref(database, `travels/${currentTravel}/${currentUser}/${category}/${item}/${field}`), nextVal);
};

window.deleteItem = (category, item) => {
    if(confirm('삭제하시겠습니까?')) {
        remove(ref(database, `travels/${currentTravel}/${currentUser}/${category}/${item}`));
    }
};

window.loadData = () => {
    currentTravel = document.getElementById('travelSelect').value;
    const userRef = ref(database, `travels/${currentTravel}/${currentUser}`);
    
    onValue(userRef, (snapshot) => {
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
};

// 초기 로딩
window.loadData();