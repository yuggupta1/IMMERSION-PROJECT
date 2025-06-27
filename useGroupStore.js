import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useGroupStore = create((set, get) => ({
  groups: [],
  selectedGroup: null,
  groupMessages: [],
  isLoading: false,
  isMessagesLoading: false,
  isCreatingGroup: false,

  // Fetch all groups the user is a member of
  getGroups: async () => {
    set({ isLoading: true });
    try {
      const res = await axiosInstance.get("/groups");
      set({ groups: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load groups");
    } finally {
      set({ isLoading: false });
    }
  },

  // Get a specific group by ID
  getGroupById: async (groupId) => {
    set({ isLoading: true });
    try {
      const res = await axiosInstance.get(`/groups/${groupId}`);
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load group");
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  // Create a new group
  createGroup: async (groupData) => {
    set({ isCreatingGroup: true });
    try {
      const res = await axiosInstance.post("/groups/create", groupData);
      set({ groups: [...get().groups, res.data] });
      toast.success("Group created successfully");
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create group");
      return null;
    } finally {
      set({ isCreatingGroup: false });
    }
  },

  // Update a group
  updateGroup: async (groupId, groupData) => {
    try {
      const res = await axiosInstance.put(`/groups/${groupId}`, groupData);
      
      // Update the group in state
      const updatedGroups = get().groups.map(group => 
        group._id === groupId ? res.data : group
      );
      
      set({ 
        groups: updatedGroups,
        selectedGroup: get().selectedGroup?._id === groupId ? res.data : get().selectedGroup
      });
      
      toast.success("Group updated successfully");
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update group");
      return null;
    }
  },

  // Delete a group
  deleteGroup: async (groupId) => {
    try {
      await axiosInstance.delete(`/groups/${groupId}`);
      
      // Remove the group from state
      set({ 
        groups: get().groups.filter(group => group._id !== groupId),
        selectedGroup: get().selectedGroup?._id === groupId ? null : get().selectedGroup
      });
      
      toast.success("Group deleted successfully");
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete group");
      return false;
    }
  },

  // Add members to a group
  addGroupMembers: async (groupId, members) => {
    try {
      const res = await axiosInstance.post(`/groups/${groupId}/members`, { members });
      
      // Update the group in state
      const updatedGroups = get().groups.map(group => 
        group._id === groupId ? res.data : group
      );
      
      set({ 
        groups: updatedGroups,
        selectedGroup: get().selectedGroup?._id === groupId ? res.data : get().selectedGroup
      });
      
      toast.success("Members added successfully");
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add members");
      return null;
    }
  },

  // Remove a member from a group
  removeGroupMember: async (groupId, memberId) => {
    try {
      const res = await axiosInstance.delete(`/groups/${groupId}/members/${memberId}`);
      
      // Update the group in state
      const updatedGroups = get().groups.map(group => 
        group._id === groupId ? res.data : group
      );
      
      set({ 
        groups: updatedGroups,
        selectedGroup: get().selectedGroup?._id === groupId ? res.data : get().selectedGroup
      });
      
      toast.success("Member removed successfully");
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to remove member");
      return null;
    }
  },

  // Leave a group
  leaveGroup: async (groupId) => {
    try {
      await axiosInstance.post(`/groups/${groupId}/leave`);
      
      // Remove the group from state
      set({ 
        groups: get().groups.filter(group => group._id !== groupId),
        selectedGroup: get().selectedGroup?._id === groupId ? null : get().selectedGroup
      });
      
      toast.success("Left group successfully");
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to leave group");
      return false;
    }
  },

  // Get messages for a group
  getGroupMessages: async (groupId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/groups/${groupId}/messages`);
      set({ groupMessages: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load messages");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  // Send a message to a group
  sendGroupMessage: async (groupId, messageData) => {
    try {
      const res = await axiosInstance.post(`/groups/${groupId}/messages`, messageData);
      set({ groupMessages: [...get().groupMessages, res.data] });
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send message");
      return null;
    }
  },

  // Socket event subscriptions
  subscribeToGroupEvents: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    // New group message
    socket.on("newGroupMessage", ({ message, groupId }) => {
      if (get().selectedGroup?._id === groupId) {
        set({ groupMessages: [...get().groupMessages, message] });
      }
    });

    // Added to a new group
    socket.on("addedToGroup", (group) => {
      set({ groups: [...get().groups, group] });
      toast.success(`You were added to ${group.name}`);
    });

    // Removed from group
    socket.on("removedFromGroup", ({ groupId }) => {
      set({ 
        groups: get().groups.filter(group => group._id !== groupId),
        selectedGroup: get().selectedGroup?._id === groupId ? null : get().selectedGroup
      });
      toast.info("You were removed from a group");
    });

    // Group updated
    socket.on("groupUpdate", (updatedGroup) => {
      const updatedGroups = get().groups.map(group => 
        group._id === updatedGroup._id ? updatedGroup : group
      );
      
      set({ 
        groups: updatedGroups,
        selectedGroup: get().selectedGroup?._id === updatedGroup._id ? updatedGroup : get().selectedGroup
      });
    });

    // Group deleted
    socket.on("groupDeleted", (groupId) => {
      set({ 
        groups: get().groups.filter(group => group._id !== groupId),
        selectedGroup: get().selectedGroup?._id === groupId ? null : get().selectedGroup
      });
      toast.info("A group you were part of was deleted");
    });

    // Member left group
    socket.on("memberLeftGroup", ({ groupId, userId, group }) => {
      const updatedGroups = get().groups.map(g => 
        g._id === groupId ? group : g
      );
      
      set({ 
        groups: updatedGroups,
        selectedGroup: get().selectedGroup?._id === groupId ? group : get().selectedGroup
      });
      
      toast.info(`A member left the group ${group.name}`);
    });
  },

  // Set selected group
  setSelectedGroup: (group) => {
    set({ selectedGroup: group });
  },

  // Clean up socket event listeners
  unsubscribeFromGroupEvents: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;
    
    socket.off("newGroupMessage");
    socket.off("addedToGroup");
    socket.off("removedFromGroup");
    socket.off("groupUpdate");
    socket.off("groupDeleted");
    socket.off("memberLeftGroup");
  }
}));