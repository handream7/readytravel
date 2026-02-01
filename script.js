import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getDatabase, ref, set, onValue, remove, update, get } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

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
let travels = ['first'];
let selectedTravelToLoad = '';

const statusToggle = { 'X': 'O', 'O': 'X' };

onValue(ref(database, 'travelNames'), (snapshot) => {
    const data = snapshot.val();
    if (data) {
        travels = Object.keys(data);
        const select = document.getElementById('travelSelect');
        const currentVal = select.value;
        select.innerHTML = travels.map(t => `<option value="${t}">${t}</option>`).join('');
        if (travels.includes(currentVal)) select.value = currentVal;
    }
});

window.switchUser = (user) => {
    currentUser = user;
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.innerText === user);
    });
    loadData();
};

function refreshSelectMenus() {
    const bulkItemCatSelect = document.getElementById('bulkItemCategorySelect');
    const singleCatSelect = document.getElementById('categorySelect');
    const optionsHTML = categories.map(c => `<option value="${c}">${c}</option>`).join('') + `<option value="미분류">없음</option>`;
    if (bulkItemCatSelect) bulkItemCatSelect.innerHTML = optionsHTML;
    if (singleCatSelect) singleCatSelect.innerHTML = optionsHTML;
}

window.addNewTravel = () => {
    const name = prompt("새 여행 이름을 입력하세요:");
    if (name) {
        set(ref(database, `travelNames/${name}`), true).then(() => {
            currentTravel = name;
            loadData();
        });
    }
};

window.saveCurrentList = () => {
    const title = prompt("목록 저장 이름을 입력하세요:");
    if (!title) return;
    get(ref(database, `travels/${currentTravel}/${currentUser}`)).then((snapshot) => {
        if (snapshot.exists()) {
            set(ref(database, `travels/${title}/${currentUser}`), snapshot.val());
            set(ref(database, `travelNames/${title}`), true).then(() => alert(`'${title}' 저장 완료!`));
        }
    });
};

window.resetCurrentList = () => {
    if (confirm("정말 현재 체크리스트를 싹 지우시겠습니까?")) {
        remove(ref(database, `travels/${currentTravel}/${currentUser}`)).then(() => alert("초기화되었습니다."));
    }
};

window.openCategoryModal = () => {
    document.getElementById('currentCategoryList').innerHTML = categories.map(c => `<span class="cat-tag">${c}</span>`).join('');
    document.getElementById('categoryModal').style.display = 'flex';
};

window.saveCategory = () => {
    const category = document.getElementById('newCategoryName').value.trim();
    if (!category || categories.includes(category)) return alert("이름을 확인하세요.");
    set(ref(database, `travels/${currentTravel}/${currentUser}/${category}/_isCategory`), true).then(() => {
        document.getElementById('newCategoryName').value = '';
        closeModal('categoryModal');
    });
};

window.addItem = () => {
    refreshSelectMenus();
    document.getElementById('itemModal').style.display = 'flex';
};

window.saveItem = () => {
    const category = document.getElementById('categorySelect').value;
    const itemName = document.getElementById('newItemName').value.trim();
    if (!itemName) return;
    set(ref(database, `travels/${currentTravel}/${currentUser}/${category}/${itemName}`), { out: 'X', in: 'X' }).then(() => {
        document.getElementById('newItemName').value = '';
        closeModal('itemModal');
    });
};

window.openLoadModal = () => {
    document.getElementById('travelListDisplay').innerHTML = travels.map(t => `<li id="list-${t}" onclick="setSelectToLoad('${t}')">✈️ ${t}</li>`).join('');
    refreshSelectMenus();
    document.getElementById('loadModal').style.display = 'flex';
};

window.setSelectToLoad = (name) => {
    selectedTravelToLoad = name;
    document.querySelectorAll('.data-list li').forEach(li => li.classList.remove('selected'));
    if (document.getElementById(`list-${name}`)) document.getElementById(`list-${name}`).classList.add('selected');
};

window.confirmLoadTravel = () => {
    if (!selectedTravelToLoad) return alert("여행을 선택하세요.");
    if (confirm(`'${selectedTravelToLoad}' 목록을 불러오시겠습니까?`)) {
        document.getElementById('travelSelect').value = selectedTravelToLoad;
        currentTravel = selectedTravelToLoad;
        loadData();
        closeModal('loadModal');
    }
};

window.uploadBulkCategories = () => {
    const text = document.getElementById('bulkCategoryText').value;
    if (!text.trim()) return;
    const cats = text.split('\n').map(c => c.trim()).filter(c => c !== "");
    const updates = {};
    cats.forEach(c => { updates[`travels/${currentTravel}/${currentUser}/${c}/_isCategory`] = true; });
    update(ref(database), updates).then(() => {
        document.getElementById('bulkCategoryText').value = '';
        alert(`${cats.length}개 생성 완료!`);
    });
};

window.uploadBulkItems = () => {
    const category = document.getElementById('bulkItemCategorySelect').value;
    const text = document.getElementById('bulkItemText').value;
    if (!text.trim()) return;
    const items = text.split('\n').map(i => i.trim()).filter(i => i !== "");
    const updates = {};
    items.forEach(item => { updates[`travels/${currentTravel}/${currentUser}/${category}/${item}`] = { out: 'X', in: 'X' }; });
    update(ref(database), updates).then(() => {
        document.getElementById('bulkItemText').value = '';
        alert(`${items.length}개 생성 완료!`);
    });
};

window.closeModal = (id) => document.getElementById(id).style.display = 'none';

window.updateStatus = (category, item, field, currentVal) => {
    set(ref(database, `travels/${currentTravel}/${currentUser}/${category}/${item}/${field}`), statusToggle[currentVal]);
};

window.confirmDelete = (category, item = null) => {
    const msg = item ? `'${item}' 삭제할까요?` : `'${category}' 삭제할까요?`;
    if (confirm(msg)) {
        const path = item ? `travels/${currentTravel}/${currentUser}/${category}/${item}` : `travels/${currentTravel}/${currentUser}/${category}`;
        remove(ref(database, path));
    }
};

window.loadData = () => {
    currentTravel = document.getElementById('travelSelect').value;
    onValue(ref(database, `travels/${currentTravel}/${currentUser}`), (snapshot) => {
        const data = snapshot.val();
        const tbody = document.getElementById('checklistBody');
        tbody.innerHTML = '';
        categories = [];
        if (!data) { refreshSelectMenus(); return; }

        Object.keys(data).sort().forEach((cat, cIdx) => {
            categories.push(cat);
            tbody.innerHTML += `
                <tr class="category-row">
                    <td colspan="3">
                        <div class="name-cell">
                            <span class="name-text">${cIdx + 1}. ${cat}</span>
                            <button class="mini-del-btn" onclick="confirmDelete('${cat}')">X</button>
                        </div>
                    </td>
                </tr>`;
            
            Object.keys(data[cat]).filter(k => k !== '_isCategory').sort().forEach((item, iIdx) => {
                const vals = data[cat][item];
                tbody.innerHTML += `
                    <tr>
                        <td>
                            <div class="name-cell">
                                <span class="name-text">${iIdx + 1}) ${item}</span>
                                <button class="mini-del-btn" onclick="confirmDelete('${cat}', '${item}')">X</button>
                            </div>
                        </td>
                        <td class="status-col"><button class="status-btn status-${vals.out}" onclick="updateStatus('${cat}', '${item}', 'out', '${vals.out}')">${vals.out}</button></td>
                        <td class="status-col"><button class="status-btn status-${vals.in}" onclick="updateStatus('${cat}', '${item}', 'in', '${vals.in}')">${vals.in}</button></td>
                    </tr>`;
            });
        });
        refreshSelectMenus();
    });
};

window.loadData();