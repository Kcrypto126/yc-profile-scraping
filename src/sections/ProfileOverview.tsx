"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { BsSend } from "react-icons/bs";
import { FaRegCopy } from "react-icons/fa6";
import { WiCloudRefresh } from "react-icons/wi";
import { HiOutlineMail } from "react-icons/hi";
import { ProfileModel } from "@/types";
import { toast } from "react-toastify";
import MessageSendModal from "@/components/MessageSendModal/MessageSendModal";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;
const SSO_KEY = process.env.NEXT_PUBLIC_SSO_KEY;
const SUS_SESSION = process.env.NEXT_PUBLIC_SUS_SESSION;

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text);
  toast.success("Link copied to clipboard");
};

const ProfileOverview = ({
  profile,
  show,
  handleClose,
  handleUpdate,
  onMessageSent,
  onProfileVisited,
}: {
  profile: ProfileModel | null;
  show: boolean;
  handleClose: () => void;
  handleUpdate: (profile: ProfileModel) => void;
  onMessageSent?: () => void;
  onProfileVisited?: () => void;
}) => {
  const [showMessageModal, setShowMessageModal] = useState(false);

  useEffect(() => {
    if (!show || !profile) return;
    const payload = profile._id
      ? { id: profile._id }
      : { userId: profile.userId };
    fetch("/api/profiles/visit", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.ok) {
          handleUpdate({
            ...profile,
            badge: data.badge ?? "visited",
            visited: true,
            visitedAt: data.visitedAt ? new Date(data.visitedAt) : new Date(),
          });
        }
      })
      .catch(() => {});
  }, [show, profile?.userId, profile?._id]);

  const updateProfile = async (url: string) => {
    try {
      const response = await fetch("/api/scrape-one", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, ssoKey: SSO_KEY, susSession: SUS_SESSION }),
      });

      if (!response.ok) toast.error("Failed to fetch profile");
      else {
        const data = await response.json();
        handleUpdate(data.profile);
        toast.success("Profile fetched successfully");
      }
    } catch {
      toast.error("Failed to fetch profile");
    }
  };

  return (
    <div
      className={`absolute top-0 left-0 w-full h-full bg-black bg-opacity-50 overflow-auto flex flex-row z-50 ${
        show ? "" : "hidden"
      }`}
    >
      <div className="w-1/2" onClick={handleClose}></div>
      <div className="w-1/2 overflow-auto">
        {profile && (
          <div className="bg-white dark:bg-gray-900 rounded-l-lg shadow-lg p-6">
            <div className="flex items-center gap-6 mb-6">
              {profile.avatar && (
                <Image
                  src={profile.avatar}
                  alt={profile.name}
                  width={160}
                  height={160}
                  className="rounded-full"
                />
              )}
              <div>
                <div className="flex flex-row gap-4">
                  <h1 className="text-2xl font-bold">{profile.name}</h1>
                  <button
                    className="p-1.5 text-xs rounded-md border text-white dark:text-gray-900 bg-blue-400 hover:bg-blue-500"
                    onClick={() => copyToClipboard(SITE_URL + profile.userId)}
                  >
                    <FaRegCopy className="w-4 h-4" />
                  </button>
                  <button
                    className="p-0.5 text-xs rounded-md border text-white dark:text-gray-900 bg-blue-400 hover:bg-blue-500"
                    onClick={() => updateProfile(SITE_URL + profile.userId)}
                  >
                    <WiCloudRefresh className="w-6 h-6" />
                  </button>
                  <button
                    className="p-1.5 text-xs rounded-md border text-white dark:text-gray-900 bg-purple-400 hover:bg-purple-500"
                    onClick={() => setShowMessageModal(true)}
                    title="Send Message"
                  >
                    <HiOutlineMail className="w-4 h-4" />
                  </button>
                  <Link
                    target="_blank"
                    href={SITE_URL + profile.userId}
                    className="p-1.5 text-xs rounded-md border text-white dark:text-gray-900 bg-green-400 hover:bg-green-500"
                  >
                    <BsSend className="w-4 h-4" />
                  </Link>
                </div>
                <p>{profile.location}</p>
                <p>{profile?.age} years old</p>
                <p>Last seen {profile.lastSeen}</p>
                <p>LinkedIn: {profile?.linkedIn}</p>
              </div>
            </div>

            <div className="grid gap-6">
              <section>
                <p>{profile.sumary}</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-4">About Me</h2>
                <h3 className="font-semibold my-1">Intro</h3>
                <p>{profile.intro}</p>
                <h3 className="font-semibold my-1">Life Story</h3>
                <p>{profile.lifeStory}</p>
                <h3 className="font-semibold my-1">Free Time</h3>
                <p>{profile.freeTime}</p>
                <h3 className="font-semibold my-1">Other</h3>
                <p>{profile.other}</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-4">My Background</h2>
                <h3 className="font-semibold my-1">
                  Impressive accomplishment
                </h3>
                <p>{profile.accomplishments}</p>
                <h3 className="font-semibold my-1">Education</h3>
                <ul className="list-disc pl-5">
                  {profile.education?.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
                <h3 className="font-semibold my-1">Employment</h3>
                <ul className="list-disc pl-5">
                  {profile.employment?.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-4">
                  {profile.startup?.name}
                </h2>
                <h3 className="font-semibold my-1">{profile.startup?.name}</h3>
                <p>{profile.startup?.description}</p>
                <h3 className="font-semibold my-1">Progress</h3>
                <p>{profile.startup?.progress}</p>
                <h3 className="font-semibold my-1">Funding Status</h3>
                <p>{profile.startup?.funding}</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-4">
                  Co-founder Preferences
                </h2>
                <ul className="list-disc pl-5">
                  {profile.cofounderPreferences?.requirements?.map((req, i) => (
                    <li key={i}>{req}</li>
                  ))}
                </ul>
                <h3 className="font-semibold my-1">Ideal co-founder</h3>
                <p>{profile.cofounderPreferences?.idealPersonality}</p>
                <h3 className="font-semibold my-1">Equity expectations</h3>
                <p>{profile.cofounderPreferences?.equity}</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-4">Interests</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold my-1">Shared</h3>
                    <ul className="list-disc pl-5">
                      {profile.interests?.shared?.map((interest, i) => (
                        <li key={i}>{interest}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold my-1">Personal</h3>
                    <ul className="list-disc pl-5">
                      {profile.interests?.personal?.map((interest, i) => (
                        <li key={i}>{interest}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
      <MessageSendModal
        show={showMessageModal}
        profile={profile}
        onClose={() => setShowMessageModal(false)}
        onSuccess={onMessageSent}
      />
    </div>
  );
};

export default ProfileOverview;
