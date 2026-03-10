"use client";
import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { ProfileModel } from "@/types";

interface Account {
  _id: string;
  name: string;
  ssoKey: string;
  susSession: string;
  isDefault?: boolean;
}

interface Template {
  _id: string;
  name: string;
  content: string;
  isDefault?: boolean;
}

interface MessageSendModalProps {
  show: boolean;
  profile: ProfileModel | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function MessageSendModal({
  show,
  profile,
  onClose,
  onSuccess,
}: MessageSendModalProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (show) {
      fetchAccounts();
      fetchTemplates();
    }
  }, [show]);

  useEffect(() => {
    if (show && profile && templates.length > 0 && selectedTemplateId) {
      const template = templates.find((t) => t._id === selectedTemplateId);
      if (template) {
        const processedMessage = template.content
          .replace(/\{\{name\}\}/g, profile.name || "")
          .replace(/\{\{startup_name\}\}/g, profile.startup?.name || "")
          .replace(/\{\{location\}\}/g, profile.location || "");
        setMessage(processedMessage);
      }
    }
  }, [show, profile, selectedTemplateId, templates]);

  const fetchAccounts = async () => {
    try {
      const res = await fetch("/api/accounts");
      const data = await res.json();
      if (data.ok && data.accounts && data.accounts.length > 0) {
        const list: Account[] = data.accounts;
        setAccounts(list);
        const defaultAccount = list.find((a) => a.isDefault);
        setSelectedAccountId((defaultAccount || list[0])._id);
        setLoadingData(false);
      } else {
        toast.error(
          "No accounts found. Please add accounts in Manage Account page."
        );
        setLoadingData(false);
      }
    } catch (error) {
      console.error("Failed to fetch accounts", error);
      toast.error("Failed to fetch accounts");
      setLoadingData(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/templates");
      const data = await res.json();
      if (data.ok && data.templates && data.templates.length > 0) {
        const list: Template[] = data.templates;
        setTemplates(list);
        const defaultTemplate = list.find((t) => t.isDefault);
        setSelectedTemplateId((defaultTemplate || list[0])._id);
      } else {
        // Use default template if none exist
        setTemplates([]);
      }
    } catch (error) {
      console.error("Failed to fetch templates", error);
    }
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = templates.find((t) => t._id === templateId);
    if (template && profile) {
      const processedMessage = template.content
        .replace(/\{\{name\}\}/g, profile.name || "")
        .replace(/\{\{startup_name\}\}/g, profile.startup?.name || "")
        .replace(/\{\{location\}\}/g, profile.location || "");
      setMessage(processedMessage);
    }
  };

  const handleSend = async () => {
    if (!profile || !message.trim()) {
      toast.error("Please enter a message");
      return;
    }

    if (!selectedAccountId) {
      toast.error("Please select an account");
      return;
    }

    const account = accounts.find((a) => a._id === selectedAccountId);
    if (!account) {
      toast.error("Selected account not found");
      return;
    }
    const template = templates.find((t) => t._id === selectedTemplateId);

    setLoading(true);
    try {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.startupschool.org/cofounder-matching/profile/";
      const response = await fetch("/api/send-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: `${siteUrl}${profile.userId}`,
          message,
          ssoKey: account.ssoKey,
          susSession: account.susSession,
          accountName: account.name,
          templateName: template?.name ?? undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        const errorMsg = data.error || data.message || "Failed to send message";
        toast.error(errorMsg);
        return;
      }

      // Show success message with invites left if available
      if (data.invitesLeft !== null && data.invitesLeft !== undefined) {
        toast.success(data.message || `Message sent successfully! You have ${data.invitesLeft} invites left for this week.`);
      } else {
        toast.success(data.message || "Message sent successfully!");
      }

      onSuccess?.();
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to send message"
      );
    } finally {
      setLoading(false);
    }
  };

  if (!show || !profile) return null;

  if (loadingData) {
    return (
      <div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        onClick={onClose}
      >
        <div
          className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <p>Loading accounts and templates...</p>
        </div>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        onClick={onClose}
      >
        <div
          className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-red-500 mb-4">No accounts found. Please add accounts in Manage Account page.</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Send Message</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {/* Account Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Account Setting
            </label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
            >
              {accounts.map((account) => (
                <option key={account._id} value={account._id}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>

          {/* Template Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Message Template
            </label>
            <select
              value={selectedTemplateId}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
              disabled={templates.length === 0}
            >
              {templates.length > 0 ? (
                templates.map((template) => (
                  <option key={template._id} value={template._id}>
                    {template.name}
                  </option>
                ))
              ) : (
                <option value="">No templates available</option>
              )}
            </select>
          </div>

          {/* Message Editor */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Message (Editable)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={10}
              className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
              placeholder="Enter your message..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 border rounded hover:bg-gray-100 dark:hover:bg-gray-800"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={loading || !message.trim()}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Sending..." : "Send Message"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

