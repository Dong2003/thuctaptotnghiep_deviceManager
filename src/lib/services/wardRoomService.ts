import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "../firebase";

export interface WardRoom {
  id: string;
  wardId: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Lấy danh sách phòng của 1 ward
export const getWardRooms = async (wardId: string): Promise<WardRoom[]> => {
  const q = query(collection(db, "wardRooms"), where("wardId", "==", wardId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(
    (doc) =>
      ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      } as WardRoom)
  );
};

// Thêm phòng
export const addWardRoom = async (
  wardId: string,
  name: string,
  description?: string
): Promise<string> => {
  const roomData = {
    wardId,
    name,
    description: description || "",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const docRef = await addDoc(collection(db, "wardRooms"), roomData);
  return docRef.id;
};

// Cập nhật phòng
export const updateWardRoom = async (
  roomId: string,
  data: Partial<WardRoom>
): Promise<void> => {
  const roomRef = doc(db, "wardRooms", roomId);
  await updateDoc(roomRef, {
    ...data,
    updatedAt: new Date(),
  });
};

// Xóa phòng
export const deleteWardRoom = async (roomId: string): Promise<void> => {
  await deleteDoc(doc(db, "wardRooms", roomId));
};
