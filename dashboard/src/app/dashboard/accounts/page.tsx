"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { UserCircle, Plus, Trash2, Edit, Eye, EyeOff } from "lucide-react";

interface Account {
  service: string;
  username: string;
  password: string;
  playerId?: string;
  profileId?: string;
  profileLimitId?: string;
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState<{ [key: string]: boolean }>({});
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Fetch accounts from backend
  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await fetch("/api/accounts");
      if (response.ok) {
        const data = await response.json();
        setAccounts(data);
      }
    } catch (error) {
      console.error("Error fetching accounts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAccount = async (account: Account) => {
    try {
      const action = editingAccount ? "update" : "create";

      const response = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...account }),
      });

      if (response.ok) {
        alert("Account saved successfully!");
        fetchAccounts();
        setShowModal(false);
        setEditingAccount(null);
      } else {
        const error = await response.text();
        alert(`Error: ${error}`);
      }
    } catch (error) {
      console.error("Error saving account:", error);
      alert("Error saving account");
    }
  };

  const handleDeleteAccount = async (account: Account) => {
    if (!confirm(`Delete account ${account.username} from ${account.service}?`)) {
      return;
    }

    try {
      const response = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", ...account }),
      });

      if (response.ok) {
        alert("Account deleted successfully!");
        fetchAccounts();
      } else {
        alert("Error deleting account");
      }
    } catch (error) {
      console.error("Error deleting account:", error);
      alert("Error deleting account");
    }
  };

  // Group accounts by service
  const groupedAccounts = accounts.reduce((acc, account) => {
    if (!acc[account.service]) {
      acc[account.service] = [];
    }
    acc[account.service].push(account);
    return acc;
  }, {} as { [key: string]: Account[] });

  const services = ["Fesster", "Action", "Betwindycity", "Abcwager", "Highroller", "Strikerich", "Godds"];

  return (
    <div className="min-h-screen p-6 space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-4 rounded-2xl">
            <UserCircle className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Account Management
            </h1>
            <p className="text-gray-400 text-lg mt-1">
              Manage betting platform accounts
            </p>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setEditingAccount(null);
            setShowModal(true);
          }}
          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl font-bold text-white shadow-lg flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Account
        </motion.button>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/80 border border-blue-500/30 rounded-2xl p-6 backdrop-blur-xl shadow-xl">
          <p className="text-sm text-gray-400 font-semibold uppercase">Total Accounts</p>
          <p className="text-4xl font-bold text-white mt-2">{accounts.length}</p>
        </div>
        <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/80 border border-purple-500/30 rounded-2xl p-6 backdrop-blur-xl shadow-xl">
          <p className="text-sm text-gray-400 font-semibold uppercase">Services Used</p>
          <p className="text-4xl font-bold text-white mt-2">{Object.keys(groupedAccounts).length}</p>
        </div>
        <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/80 border border-green-500/30 rounded-2xl p-6 backdrop-blur-xl shadow-xl">
          <p className="text-sm text-gray-400 font-semibold uppercase">Weekly Cost</p>
          <p className="text-4xl font-bold text-green-400 mt-2">${accounts.length * 10}</p>
          <p className="text-xs text-gray-400 mt-1">$10 per account per week</p>
        </div>
      </div>

      {/* Accounts by Service */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full"
          />
        </div>
      ) : (
        <div className="space-y-6">
          {services.map((service) => {
            const serviceAccounts = groupedAccounts[service] || [];
            if (serviceAccounts.length === 0) return null;

            return (
              <motion.div
                key={service}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-slate-900/80 to-slate-800/80 border border-blue-500/30 rounded-2xl p-6 backdrop-blur-xl shadow-xl"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-white">{service}</h2>
                  <span className="px-4 py-2 bg-blue-500/20 border border-blue-400/40 rounded-full text-sm font-bold text-blue-200">
                    {serviceAccounts.length} account{serviceAccounts.length !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="space-y-3">
                  {serviceAccounts.map((account, idx) => (
                    <div
                      key={`${account.service}-${account.username}-${idx}`}
                      className="bg-slate-800/50 border border-gray-700 rounded-xl p-4 flex items-center justify-between"
                    >
                      <div className="flex-1">
                        <p className="text-white font-bold">{account.username}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-gray-400 text-sm">
                            {showPassword[`${account.service}-${account.username}`]
                              ? account.password
                              : "••••••••"}
                          </p>
                          <button
                            onClick={() =>
                              setShowPassword((prev) => ({
                                ...prev,
                                [`${account.service}-${account.username}`]: !prev[`${account.service}-${account.username}`],
                              }))
                            }
                            className="text-gray-400 hover:text-white transition"
                          >
                            {showPassword[`${account.service}-${account.username}`] ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => {
                            setEditingAccount(account);
                            setShowModal(true);
                          }}
                          className="p-2 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg text-blue-300 transition"
                        >
                          <Edit className="w-5 h-5" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleDeleteAccount(account)}
                          className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-300 transition"
                        >
                          <Trash2 className="w-5 h-5" />
                        </motion.button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Account Modal */}
      {showModal && (
        <AccountModal
          account={editingAccount}
          services={services}
          onSave={handleSaveAccount}
          onClose={() => {
            setShowModal(false);
            setEditingAccount(null);
          }}
        />
      )}
    </div>
  );
}

function AccountModal({
  account,
  services,
  onSave,
  onClose,
}: {
  account: Account | null;
  services: string[];
  onSave: (account: Account) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState<Account>(
    account || {
      service: services[0],
      username: "",
      password: "",
      playerId: "",
      profileId: "",
      profileLimitId: "",
    }
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        className="bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-blue-500/40 rounded-3xl p-8 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-white mb-6">
          {account ? "Edit Account" : "Add Account"}
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-200 mb-2">Service</label>
            <select
              value={formData.service}
              onChange={(e) => setFormData({ ...formData, service: e.target.value })}
              className="w-full px-4 py-3 bg-slate-900/80 border-2 border-blue-500/30 rounded-xl text-white font-semibold focus:outline-none focus:border-blue-500/60"
            >
              {services.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-200 mb-2">Username</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="w-full px-4 py-3 bg-slate-900/80 border-2 border-blue-500/30 rounded-xl text-white font-semibold focus:outline-none focus:border-blue-500/60"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-200 mb-2">Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-3 bg-slate-900/80 border-2 border-blue-500/30 rounded-xl text-white font-semibold focus:outline-none focus:border-blue-500/60"
            />
          </div>
        </div>

        <div className="flex gap-4 mt-6">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-bold text-white"
          >
            Cancel
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSave(formData)}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl font-bold text-white shadow-lg"
          >
            Save
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}


