import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";


export const useSellerStore = create((set, get) => ({
    Sellers: [],

        getSeller : async () => {
            try {
                const res = await axiosInstance.get('/seller/getseller')
                set({Sellers:res.data.allSeller})
            } catch (error) {
                toast.error(error?.response?.data?.message || "Something went wrong")
            }
        }
}))