import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getDatabase, ref, set, onValue, remove, update } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

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

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

let currentUser = '강민성';
let currentTravel = 'first';
let categories = [];
const statusCycle = { 'X': '△', '△': 'O', 'O': 'X' };

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
        option.value = name; option.text = name;
        select.add(option);
        select.value = name;
        currentTravel = name;
        loadData();
    }
};

window.addCategory = () => {
    const category = prompt("새 카테고리 이름:");
    if (!category) return;
    set(ref(database, `travels/${currentTravel}/${currentUser}/${category}`), { _isCategory: true });
};

window.openModal = (id) => {
    if (id === 'itemModal' || id === 'loadModal') {
        const selects = ['categorySelect', 'bulkCategorySelect'];
        selects.forEach(sId => {
            const select = document.getElementById(sId);
            select.innerHTML = '';
            if (categories.length === 0) {
                const opt = document.createElement('option');
                opt.value = "미분류"; opt.text = "없음 (미분류)";
                select.add(opt);
            } else {
                categories.forEach(cat => {
                    const opt = document.createElement('option');
                    opt.value = cat; opt.text = cat;
                    select.add(opt);
                });
                const optNone = document.createElement('option');
                optNone.value = "미분류"; optNone.text = "없음";
                select.add(optNone);
            }
        });
    }
    document.getElementById(id).style.display = 'flex';
};

window.addItem = () => window.openModal('itemModal');
window.openLoadModal = () => window.openModal('loadModal');

window.closeModal = (id) => document.getElementById(id).style.display = 'none';

window.saveItem = () => {
    const category = document.getElementById('categorySelect').value;
    const itemName = document.getElementById('newItemName').value;
    if (!itemName) return alert("아이템 이름을 입력하세요!");

    set(ref(database, `travels/${currentTravel}/${currentUser}/${category}/${itemName}`), {
        prep_out: 'X', done_out: 'X', prep_in: 'X', done_in: 'X'
    }).then(() => {
        document.getElementById('newItemName').value = '';
        closeModal('itemModal');
    });
};

window.uploadBulk = () => {
    const category = document.getElementById('bulkCategorySelect').value;
    const text = document.getElementById('bulkText').value;
    if (!text.trim()) return alert("목록을 입력하세요!");

    const items = text.split('\n').map(i => i.trim()).filter(i => i !== "");
    const updates = {};
    items.forEach(item => {
        updates[`travels/${currentTravel}/${currentUser}/${category}/${item}`] = {
            prep_out: 'X', done_out: 'X', prep_in: 'X', done_in: 'X'
        };
    });

    update(ref(database), updates).then(() => {
        document.getElementById('bulkText').value = '';
        alert(`${items.length}개의 아이템이 추가되었습니다.`);
        closeModal('loadModal');
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
        categories = [];

        if (!data) return;

        for (let category in data) {
            categories.push(category);
            const catRow = `<tr class="category-row"><td colspan="6">${category}</td></tr>`;
            tbody.innerHTML += catRow;

            for (let item in data[category]) {
                if (item === '_isCategory') continue;
                const vals = data[category][item];
                const row = `
                    <tr>
                        <td style="text-align:left; padding-left:35px;">${item}</td>
                        <td><button class="status-btn status-${vals.prep_out}" onclick="updateStatus('${category}', '${item}', 'prep_out', '${vals.prep_out}')">${vals.prep_out}</button></td>
                        <td><button class="status-btn status-${vals.done_out}" onclick="updateStatus('${category}', '${item}', 'done_out', '${vals.done_out}')">${vals.done_out}</button></td>
                        <td><button class="status-btn status-${vals.prep_in}" onclick="updateStatus('${category}', '${item}', 'prep_in', '${vals.prep_in}')">${vals.prep_in}</button></td>
                        <td><button class="status-btn status-${vals.done_in}" onclick="updateStatus('${category}', '${item}', 'done_in', '${vals.done_in}')">${vals.done_in}</button></td>
                        <td><button class="delete-btn" onclick="deleteItem('${category}', '${item}')">삭제</button></td>
                    </tr>
                `;
                tbody.innerHTML += row;
            }
        }
    });
};

window.loadData();