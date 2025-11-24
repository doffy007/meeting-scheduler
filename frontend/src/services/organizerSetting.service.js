import axiosClient from "../api/axiosClient";

export const organizerSettingsService = {

    getSettings: async () => {
        const res = await axiosClient.get("/organizer-settings");
        return res.data;
    },

    saveSettings: async (data, isNew) => {
        if (isNew) {
            const res = await axiosClient.post("/organizer-settings", data);
            return res.data;
        } else {
            const res = await axiosClient.put("/organizer-settings", data);
            return res.data;
        }
    },

    createSettings: async (data) => {
        const res = await axiosClient.post(`/organizer-settings/${data.id}`, data);
        return res.data;
    },

    updateSettings: async (data) => {
        return axiosClient.put(`/organizer-settings/${data.id}`, data);
    }

};