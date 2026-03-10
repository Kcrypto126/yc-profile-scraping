"use client";

import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import AuthGuard from "@/components/AuthGuard";

interface Account {
  _id?: string;
  name: string;
  ssoKey: string;
  susSession: string;
  isDefault?: boolean;
}

interface Template {
  _id?: string;
  name: string;
  content: string;
  isDefault?: boolean;
}

export default function ManageAccountPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [changePasswordSubmitting, setChangePasswordSubmitting] = useState(false);

  function fetchAccounts() {
    (async () => {
      try {
        const res = await fetch("/api/accounts");
        const data = await res.json();
        if (data.ok) {
          setAccounts(data.accounts || []);
        }
      } catch {
        toast.error("Failed to fetch accounts");
      } finally {
        setLoading(false);
      }
    })();
  }

  function fetchTemplates() {
    (async () => {
      try {
        const res = await fetch("/api/templates");
        const data = await res.json();
        if (data.ok) {
          setTemplates(data.templates || []);
        }
      } catch {
        toast.error("Failed to fetch templates");
      }
    })();
  }

  useEffect(() => {
    fetchAccounts();
    fetchTemplates();
  }, []);

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
          <p>Loading accounts and templates...</p>
        </div>
      </AuthGuard>
    );
  }

  const handleSaveAccount = async (account: Account) => {
    try {
      if (account._id) {
        // Update
        const res = await fetch(`/api/accounts/${account._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(account),
        });
        const data = await res.json();
        if (data.ok) {
          toast.success("Account updated successfully");
          fetchAccounts();
        } else {
          toast.error(data.error || "Failed to update account");
        }
      } else {
        // Create
        const res = await fetch("/api/accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(account),
        });
        const data = await res.json();
        if (data.ok) {
          toast.success("Account created successfully");
          fetchAccounts();
        } else {
          toast.error(data.error || "Failed to create account");
        }
      }
      setShowAccountForm(false);
      setEditingAccount(null);
    } catch {
      toast.error("Failed to save account");
    }
  };

  const handleDeleteAccount = async (id: string) => {
    if (!confirm("Are you sure you want to delete this account?")) return;
    try {
      const res = await fetch(`/api/accounts/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.ok) {
        toast.success("Account deleted successfully");
        fetchAccounts();
      } else {
        toast.error(data.error || "Failed to delete account");
      }
    } catch {
      toast.error("Failed to delete account");
    }
  };

  const handleSaveTemplate = async (template: Template) => {
    try {
      if (template._id) {
        // Update
        const res = await fetch(`/api/templates/${template._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(template),
        });
        const data = await res.json();
        if (data.ok) {
          toast.success("Template updated successfully");
          fetchTemplates();
        } else {
          toast.error(data.error || "Failed to update template");
        }
      } else {
        // Create
        const res = await fetch("/api/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(template),
        });
        const data = await res.json();
        if (data.ok) {
          toast.success("Template created successfully");
          fetchTemplates();
        } else {
          toast.error(data.error || "Failed to create template");
        }
      }
      setShowTemplateForm(false);
      setEditingTemplate(null);
    } catch {
      toast.error("Failed to save template");
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;
    try {
      const res = await fetch(`/api/templates/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.ok) {
        toast.success("Template deleted successfully");
        fetchTemplates();
      } else {
        toast.error(data.error || "Failed to delete template");
      }
    } catch {
      toast.error("Failed to delete template");
    }
  };

  const handleChangePassword = async (currentPassword: string, newPassword: string) => {
    setChangePasswordSubmitting(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        toast.error(data.error || "Failed to change password");
        return;
      }
      toast.success("Password changed successfully");
      setChangePasswordOpen(false);
    } finally {
      setChangePasswordSubmitting(false);
    }
  };

  const handleSetDefaultAccount = async (id: string) => {
    try {
      const res = await fetch(`/api/accounts/${id}/default`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        toast.success("Default account updated");
        fetchAccounts();
      } else {
        toast.error(data.error || "Failed to set default account");
      }
    } catch {
      toast.error("Failed to set default account");
    }
  };

  const handleSetDefaultTemplate = async (id: string) => {
    try {
      const res = await fetch(`/api/templates/${id}/default`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        toast.success("Default template updated");
        fetchTemplates();
      } else {
        toast.error(data.error || "Failed to set default template");
      }
    } catch {
      toast.error("Failed to set default template");
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-[calc(100vh-64px)] p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Manage Accounts & Templates</h1>

          {/* Change password */}
          <div className="mb-8">
            {!changePasswordOpen ? (
              <button
                type="button"
                onClick={() => setChangePasswordOpen(true)}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Change password
              </button>
            ) : (
              <ChangePasswordForm
                onSubmit={handleChangePassword}
                onCancel={() => setChangePasswordOpen(false)}
                submitting={changePasswordSubmitting}
              />
            )}
          </div>

          {/* Accounts Section */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold">Accounts</h2>
              <button
                onClick={() => {
                  setEditingAccount({ name: "", ssoKey: "", susSession: "" });
                  setShowAccountForm(true);
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Add Account
              </button>
            </div>

            {showAccountForm && (
              <AccountForm
                account={editingAccount || { name: "", ssoKey: "", susSession: "" }}
                onSave={handleSaveAccount}
                onCancel={() => {
                  setShowAccountForm(false);
                  setEditingAccount(null);
                }}
              />
            )}

            <div className="grid gap-4">
              {accounts.map((account) => (
                <div
                  key={account._id}
                  className="border rounded-lg p-4 dark:bg-gray-800"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{account.name}</h3>
                        {account.isDefault && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-green-600 text-white">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        SSO Key: {account.ssoKey.substring(0, 20)}...
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Session: {account.susSession.substring(0, 20)}...
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingAccount(account);
                          setShowAccountForm(true);
                        }}
                        className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                      >
                        Edit
                      </button>
                      {!account.isDefault && account._id && (
                        <button
                          onClick={() => handleSetDefaultAccount(account._id!)}
                          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Set default
                        </button>
                      )}
                      <button
                        onClick={() => account._id && handleDeleteAccount(account._id)}
                        className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Templates Section */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold">Message Templates</h2>
              <button
                onClick={() => {
                  setEditingTemplate({ name: "", content: "" });
                  setShowTemplateForm(true);
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Add Template
              </button>
            </div>

            {showTemplateForm && (
              <TemplateForm
                template={editingTemplate || { name: "", content: "" }}
                onSave={handleSaveTemplate}
                onCancel={() => {
                  setShowTemplateForm(false);
                  setEditingTemplate(null);
                }}
              />
            )}

            <div className="grid gap-4">
              {templates.map((template) => (
                <div
                  key={template._id}
                  className="border rounded-lg p-4 dark:bg-gray-800"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{template.name}</h3>
                        {template.isDefault && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-green-600 text-white">
                            Default
                          </span>
                        )}
                      </div>
                      <pre className="text-sm text-gray-600 dark:text-gray-400 mt-2 whitespace-pre-wrap">
                        {template.content}
                      </pre>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingTemplate(template);
                          setShowTemplateForm(true);
                        }}
                        className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                      >
                        Edit
                      </button>
                      {!template.isDefault && template._id && (
                        <button
                          onClick={() => handleSetDefaultTemplate(template._id!)}
                          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Set default
                        </button>
                      )}
                      <button
                        onClick={() => template._id && handleDeleteTemplate(template._id)}
                        className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}

function ChangePasswordForm({
  onSubmit,
  onCancel,
  submitting,
}: {
  onSubmit: (currentPassword: string, newPassword: string) => void;
  onCancel: () => void;
  submitting: boolean;
}) {
  const [current, setCurrent] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");

  const handleSubmit = () => {
    if (newPass.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    if (newPass !== confirm) {
      toast.error("New password and confirmation do not match");
      return;
    }
    onSubmit(current, newPass);
  };

  return (
    <div className="border rounded-lg p-4 max-w-md dark:bg-gray-800">
      <h2 className="text-xl font-semibold mb-4">Change password</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Current password</label>
          <input
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
            placeholder="Current password"
            autoComplete="current-password"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">New password</label>
          <input
            type="password"
            value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
            className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
            placeholder="At least 8 characters"
            autoComplete="new-password"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Confirm new password</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
            placeholder="Confirm new password"
            autoComplete="new-password"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-60"
          >
            {submitting ? "Changing..." : "Change password"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function AccountForm({
  account,
  onSave,
  onCancel,
}: {
  account: Account;
  onSave: (account: Account) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState(account);

  useEffect(() => {
    setFormData(account);
  }, [account]);

  return (
    <div className="border rounded-lg p-4 mb-4 dark:bg-gray-800">
      <h3 className="font-semibold mb-4">
        {account._id ? "Edit Account" : "New Account"}
      </h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
            placeholder="Account name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">SSO Key</label>
          <input
            type="text"
            value={formData.ssoKey}
            onChange={(e) => setFormData({ ...formData, ssoKey: e.target.value })}
            className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
            placeholder="SSO Key"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Session</label>
          <textarea
            value={formData.susSession}
            onChange={(e) =>
              setFormData({ ...formData, susSession: e.target.value })
            }
            className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
            rows={3}
            placeholder="Session token"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onSave(formData)}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Save
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function TemplateForm({
  template,
  onSave,
  onCancel,
}: {
  template: Template;
  onSave: (template: Template) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState(template);

  useEffect(() => {
    setFormData(template);
  }, [template]);

  return (
    <div className="border rounded-lg p-4 mb-4 dark:bg-gray-800">
      <h3 className="font-semibold mb-4">
        {template._id ? "Edit Template" : "New Template"}
      </h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
            placeholder="Template name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            Content (use {"{{name}}"}, {"{{startup_name}}"}, {"{{location}}"} for
            placeholders)
          </label>
          <textarea
            value={formData.content}
            onChange={(e) =>
              setFormData({ ...formData, content: e.target.value })
            }
            className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
            rows={10}
            placeholder="Template content"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onSave(formData)}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Save
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

