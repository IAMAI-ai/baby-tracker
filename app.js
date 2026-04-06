import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getFirestore, collection, addDoc, serverTimestamp, query, orderBy, 
    limit, onSnapshot, doc, updateDoc, deleteDoc, where 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
    getStorage, ref, uploadBytes, getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// 1. Firebase 配置信息
const firebaseConfig = {
  apiKey: "AIzaSyCckGV4SJzHjUW2xMKrvtdv6PRb3js-0h8",
  authDomain: "baby-tracker-5464f.firebaseapp.com",
  projectId: "baby-tracker-5464f",
  storageBucket: "baby-tracker-5464f.firebasestorage.app",
  messagingSenderId: "42442664907",
  appId: "1:42442664907:web:0297aa44d34bfb5637e44e",
  measurementId: "G-0RX7DMW4XY"
};

// 2. 初始化服务
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

/**
 * 强化版保存记录：
 * 强制将 familyId 转为字符串，确保与索引匹配
 */
async function saveRecord(type, familyId) {
    try {
        const idStr = String(familyId); // 关键修复：确保 ID 永远是字符串类型
        await addDoc(collection(db, "baby_logs"), {
            type: type,
            familyId: idStr,
            timestamp: serverTimestamp(), // 数据库时间
            createdAt: serverTimestamp()
        });
        console.log(`成功记录: ${type} (家庭暗号: ${idStr})`);
        return true;
    } catch (e) {
        console.error("保存失败:", e);
        return false;
    }
}

/**
 * 强化版实时监听：
 * 增加错误捕获，并在数据返回时检查时间戳，防止新数据被漏掉
 */
function listenToLogs(familyId, callback) {
    const idStr = String(familyId); // 确保查询类型一致
    const q = query(
        collection(db, "baby_logs"), 
        where("familyId", "==", idStr), 
        orderBy("timestamp", "desc"), 
        limit(50) // 增加到50条，防止由于排序问题导致的显示不全
    );

    // 返回监听器
    return onSnapshot(q, (snapshot) => {
        const logs = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            
            // 关键优化：如果 timestamp 还没从服务器返回（pending），先使用本地时间占位显示
            // 这样点击按钮后列表会立刻反应，而不会等待索引筛选后再显示
            const date = data.timestamp ? data.timestamp.toDate() : new Date();
            
            const timeStr = date.getHours().toString().padStart(2, '0') + ":" + 
                           date.getMinutes().toString().padStart(2, '0');
            const fullTime = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
            
            logs.push({ id: doc.id, ...data, timeStr, fullTime });
        });
        
        console.log(`[实时监听] 捕获到 ${logs.length} 条记录`);
        callback(logs);
    }, (error) => {
        // 如果索引失效或权限有问题，这里会直接报错
        console.error("Firebase 监听器报错:", error.message);
        if (error.message.includes("index")) {
            alert("数据库索引正在配置中，请稍等 1-2 分钟后再试。");
        }
    });
}

async function updateRecord(id, newTime) {
    try {
        await updateDoc(doc(db, "baby_logs", id), { timestamp: new Date(newTime) });
        return true;
    } catch (e) { return false; }
}

async function deleteRecord(id) {
    if(confirm("确定要删除这条记录吗？")) {
        try {
            await deleteDoc(doc(db, "baby_logs", id));
            return true;
        } catch (e) { return false; }
    }
}

async function uploadAvatar(file, familyId) {
    try {
        const storageRef = ref(storage, `baby_info/${familyId}_avatar.jpg`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        localStorage.setItem(`avatar_${familyId}`, url);
        return url;
    } catch (e) { return null; }
}

// 导出到全局
window.saveRecord = saveRecord;
window.listenToLogs = listenToLogs;
window.updateRecord = updateRecord;
window.deleteRecord = deleteRecord;
window.uploadAvatar = uploadAvatar;