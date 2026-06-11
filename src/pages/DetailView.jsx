import { useState, useEffect, useRef } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase/config";
import {
  subscribeSatsang, getAttendees, checkAttendance, cancelSatsang, updateSatsang
} from "../firebase/firestore";
import { C, fmtDate, fmtTime, STANDARD_SEVAS } from "../utils/constants";
import Label from "../components/ui/Label";
import Btn from "../components/ui/Btn";
import Page from "../components/ui/Page";
import Empty from "../components/ui/Empty";
import { toPng } from "html-to-image";
import { QRCodeCanvas } from "qrcode.react";
import guruji01 from "../assets/images/guruji-01.png";
import inviteBg from "../assets/images/invite_bg.png";
import gurujiPortrait from "../assets/images/guruji_portrait.png";

export default function DetailView({ satsangId, user, profile, nav, notify, onRefresh }) {
  const [s, setS] = useState(null);
  const [attendees, setAt] = useState([]);
  const [myAtt, setMyAtt] = useState(null);
  const [showAddressTooltip, setShowAddressTooltip] = useState(false);
  const [selectedGuests, setSelectedGuests] = useState([]);
  const [sevaMapping, setSevaMapping] = useState({});
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState("attendance");
  const [showGuestsPanel, setShowGuestsPanel] = useState(false);
  const [showSevaPanel, setShowSevaPanel] = useState(false);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [invitePreset, setInvitePreset] = useState(0);
  const [customInviteText, setCustomInviteText] = useState("");
  const [titlePreset, setTitlePreset] = useState(2); // Default to existing Satsang title
  const [customTitleText, setCustomTitleText] = useState("");
  const [generatingImage, setGeneratingImage] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState("");
  const inviteRef = useRef(null);

  const INVITE_PRESETS = [
    "With the blessings of Guruji Maharaj, we request the pleasure of your company for Satsang, Chai, and Langar Prasad.",
    "Jai Guruji. We warmly invite you to join us for our family Satsang and receive Guruji's blessings and Langar Prasad.",
    "By the grace of Guruji, we request your presence in our home for a divine evening of Satsang and Langar Prasad."
  ];

  const currentInviteText = invitePreset === 99 ? customInviteText : INVITE_PRESETS[invitePreset];

  const TITLE_PRESETS = [
    "Guruji's Satsang",
    "Guruji Ka Satsang",
    s?.title || "Satsang"
  ];
  const currentTitleText = titlePreset === 99 ? customTitleText : (TITLE_PRESETS[titlePreset] || "Satsang");

  const getResponsiveMessageFontSize = (text) => {
    const len = text ? text.length : 0;
    if (len < 60) return 15;
    if (len < 100) return 13;
    if (len < 140) return 11.5;
    return 10.5;
  };

  const getResponsiveTitleFontSize = (text) => {
    const len = text ? text.length : 0;
    if (len < 15) return 20;
    if (len < 25) return 17;
    return 14;
  };

  const getResponsiveAddressFontSize = (text) => {
    const len = text ? text.length : 0;
    if (len < 25) return 10;
    if (len < 40) return 9;
    if (len < 55) return 8;
    if (len < 75) return 7;
    if (len < 95) return 6.5;
    return 5.5;
  };

  const handleDownloadInvite = async () => {
    if (!inviteRef.current) return;
    setGeneratingImage(true);
    try {
      // First render (iOS/Safari warm-up render to load/cache fonts/images)
      await toPng(inviteRef.current, { cacheBust: true, pixelRatio: 2 });
      await new Promise(r => setTimeout(r, 150));
      
      // Actual final render
      const dataUrl = await toPng(inviteRef.current, {
        cacheBust: true,
        pixelRatio: 2,
      });

      // Synchronous base64 to Blob conversion (more reliable than fetch(dataUrl))
      const byteString = atob(dataUrl.split(',')[1]);
      const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: mimeString });
      const file = new File([blob], `Satsang_Invite_${s.date.replace(/[^a-zA-Z0-9]/g, "_")}.png`, { type: "image/png" });

      // Try to share via native share sheet first (supported on mobile safari/chrome)
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: "Satsang Invite",
            text: "Scan the QR code to register. Jai Guruji! 🙏"
          });
          notify("Choose 'Save Image' in the menu to save directly to your Photos library! 📸");
          setGeneratingImage(false);
          return;
        } catch (shareErr) {
          console.warn("Native share failed, using fallback:", shareErr);
        }
      }

      // Check if user is on mobile
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) {
        // Show long-press modal on mobile if share sheet failed/is not supported
        // This is the absolute best way to ensure saving directly to Photos/Image Library instead of Files app.
        setGeneratedImageUrl(dataUrl);
        notify("Long-press the image to save directly to your Photos library! 📸");
      } else {
        // Desktop fallback: direct browser download
        const link = document.createElement("a");
        link.download = `Satsang_Invite_${s.date.replace(/[^a-zA-Z0-9]/g, "_")}.png`;
        link.href = dataUrl;
        link.click();
        notify("Invite downloaded! 🙏");
      }
    } catch (err) {
      console.error("Failed to generate invite image:", err);
      notify("Failed to save invite image. Please try again.", "err");
    }
    setGeneratingImage(false);
  };

  const invitePageUrl = `https://gurujisatsangs.com/#/satsang/${satsangId}`;

  const handleWhatsAppShare = () => {
    const venueLines = [s.addressLine1 || s.address, s.addressLine2, s.addressLine3].filter(Boolean).join(', ');
    const textMessage = `🙏 Jai Guruji! You are warmly invited to attend our upcoming Satsang. \n\nDetails:\n📅 Date: ${s.date}\n⏰ Time: ${s.time}\n📍 Venue: ${venueLines}, ${s.city}${s.postcode ? ' ' + s.postcode : ''}\n\nPlease click the link below to register and confirm your attendance:\n${invitePageUrl}\n\nShukrana Guruji! 🙏`;
    const shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(textMessage)}`;
    window.open(shareUrl, "_blank");
  };

  useEffect(() => {
    if (!satsangId) return;
    const unsub = subscribeSatsang(satsangId, setS);
    return unsub;
  }, [satsangId]);

  useEffect(() => {
    if (!satsangId || !user) return;
    checkAttendance(satsangId, user.uid).then(setMyAtt);
  }, [satsangId, user]);

  useEffect(() => {
    if (!satsangId || !user || !s) return;
    if (s.organizerUid === user.uid || profile?.role === "admin") {
      getAttendees(satsangId).then(setAt).catch(err => console.warn("Failed fetching attendees:", err));
    }
  }, [satsangId, user, s, profile]);

  if (!s) return <div style={{ textAlign: "center", padding: 80, color: C.muted }}>Loading Satsang… 🙏</div>;

  const left = s.maxAttendees - (s.attendeeCount || 0);
  const isHost = s && user && s.organizerUid === user.uid;
  const isAdmin = profile?.role === "admin";
  const shouldHideAddress = s.hideAddressUntilApproved && !isHost && !isAdmin && myAtt?.status !== "confirmed";

  const handleToggleVisibility = async () => {
    const nextPrivate = !s.isPrivate;
    const confirmMsg = nextPrivate
      ? "Are you sure you want to make this Satsang private? This will make the Satsang hidden from everyone on the Find Satsang page, and it will only be accessible via direct link sharing. 🙏"
      : "Are you sure you want to make this Satsang public? This action will make the Satsang visible to all Sangat members registered on the app, displaying it on the Find Satsang page and map. 🙏";

    if (window.confirm(confirmMsg)) {
      setBusy(true);
      try {
        await updateSatsang(satsangId, { isPrivate: nextPrivate });
        notify(nextPrivate ? "Satsang is now private. 🔒" : "Satsang is now public. 🌍");
        if (onRefresh) onRefresh();
      } catch (e) {
        notify(e.message, "err");
      }
      setBusy(false);
    }
  };

  const mySevaNames = Object.values(s.sevas || {})
    .filter(sv => sv.enrolled?.some(e => e.attendeeUid === user?.uid || e.uid === user?.uid))
    .map(sv => STANDARD_SEVAS.find(x => x.id === sv.id)?.name)
    .filter(Boolean);

  const formatRequestedSevas = (reqs) => {
    if (!Array.isArray(reqs)) return "";
    return reqs.map(rs => {
      if (typeof rs === "string") {
        return STANDARD_SEVAS.find(x => x.id === rs)?.name;
      }
      if (rs && typeof rs === "object" && rs.sevaId) {
        const sName = STANDARD_SEVAS.find(x => x.id === rs.sevaId)?.name || rs.sevaId;
        const pLabel = rs.personId === user?.uid ? "Me" : rs.personName;
        return `${sName} for ${pLabel}`;
      }
      return "";
    }).filter(Boolean).join(", ");
  };

  const renderAttendeeSevaStatus = (a) => {
    const reqSevas = a.requestedSevas || [];
    if (reqSevas.length === 0) return null;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
        {reqSevas.map((rs, idx) => {
          const sName = STANDARD_SEVAS.find(x => x.id === rs.sevaId)?.name || rs.sevaId;
          const label = rs.personId === a.id ? rs.personName : `${rs.personName} (Guest)`;

          if (a.status === 'confirmed') {
            if (rs.status === 'pending') {
              return (
                <div key={idx} style={{ display: "inline-flex", background: "rgba(212,151,42,0.1)", border: `1px solid rgba(212,151,42,0.3)`, color: C.gold, fontSize: 12, padding: "6px 12px", borderRadius: 6, alignItems: "center", gap: 6, width: "fit-content" }}>
                  ✉ Offered Seva: <strong>{sName}</strong> for {label} (Needs approval in Seva tab)
                </div>
              );
            } else if (rs.status === 'confirmed') {
              return (
                <div key={idx} style={{ display: "inline-flex", background: "rgba(76,130,80,0.1)", border: `1px solid rgba(76,130,80,0.3)`, color: "#7db87f", fontSize: 12, padding: "6px 12px", borderRadius: 6, alignItems: "center", gap: 6, width: "fit-content" }}>
                  ✓ Seva Confirmed: <strong>{sName}</strong> for {label}
                </div>
              );
            } else if (rs.status === 'declined') {
              return (
                <div key={idx} style={{ display: "inline-flex", background: "rgba(224,107,16,0.05)", border: `1px solid rgba(224,107,16,0.2)`, color: C.saffron, fontSize: 12, padding: "6px 12px", borderRadius: 6, alignItems: "center", gap: 6, width: "fit-content" }}>
                  ❌ Seva Declined: <strong>{sName}</strong> for {label}
                </div>
              );
            }
          } else {
            return (
              <div key={idx} style={{ display: "inline-flex", background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}`, color: C.muted, fontSize: 12, padding: "6px 12px", borderRadius: 6, alignItems: "center", gap: 6, width: "fit-content" }}>
                🕒 Also offered Seva: <strong>{sName}</strong> for {label} (Reviewable upon confirming attendance)
              </div>
            );
          }
          return null;
        })}
      </div>
    );
  };

  const exportSevaSheet = () => {
    const confirmedSevas = [];
    Object.values(s.sevas || {}).forEach(sv => {
      const enrolled = sv.enrolled || [];
      const sName = STANDARD_SEVAS.find(x => x.id === sv.id)?.name || sv.id;
      enrolled.forEach(e => {
        const att = attendees.find(a => a.id === e.attendeeUid);
        confirmedSevas.push({
          personName: e.name,
          sevaName: sName,
          primaryName: att ? att.userName : e.name,
          phone: att ? att.userPhone : ""
        });
      });
    });

    confirmedSevas.sort((a, b) => a.personName.localeCompare(b.personName));

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      notify("Popup blocker prevented exporting seva sheet. Please allow popups.", "err");
      return;
    }
    const htmlContent = `
      <html>
        <head>
          <title>Day-of Seva Sheet - ${s.title}</title>
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; color: #333; background: #fff; }
            h1 { font-size: 24px; margin-bottom: 5px; color: #111; }
            h2 { font-size: 14px; font-weight: normal; color: #666; margin-top: 0; margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { text-align: left; padding: 12px 10px; border-bottom: 2px solid #ddd; font-size: 13px; text-transform: uppercase; color: #666; }
            td { padding: 12px 10px; border-bottom: 1px solid #eee; font-size: 14px; }
            .checkbox { width: 20px; height: 20px; border: 1px solid #999; border-radius: 4px; display: inline-block; }
            .header-info { margin-bottom: 30px; border-bottom: 1px solid #eee; padding-bottom: 20px; }
            @media print {
              body { padding: 0; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header-info">
            <h1>🌹 Day-of Seva Allocation Sheet</h1>
            <h2><strong>Event:</strong> ${s.title} &nbsp;|&nbsp; <strong>Date:</strong> ${s.date} at ${s.time} &nbsp;|&nbsp; <strong>Venue:</strong> ${s.addressLine1 || s.address}, ${s.city}${s.postcode ? ' ' + s.postcode : ''}</h2>
            <button onclick="window.print()" style="padding: 10px 20px; background: #d4972a; border: none; color: #fff; font-weight: bold; border-radius: 6px; cursor: pointer; font-size: 14px;">Print Seva Sheet</button>
          </div>
          
          ${confirmedSevas.length === 0 ? `
            <p style="text-align: center; color: #666; padding: 40px; font-style: italic;">No confirmed Seva assignments found for this Satsang.</p>
          ` : `
            <table>
              <thead>
                <tr>
                  <th style="width: 5%">Check-in</th>
                  <th style="width: 30%">Sevadar Name</th>
                  <th style="width: 30%">Seva Role</th>
                  <th style="width: 20%">Primary Member</th>
                  <th style="width: 15%">Phone Number</th>
                </tr>
              </thead>
              <tbody>
                ${confirmedSevas.map(cs => `
                  <tr>
                    <td><div class="checkbox"></div></td>
                    <td><strong>${cs.personName}</strong></td>
                    <td>${cs.sevaName}</td>
                    <td>${cs.primaryName}</td>
                    <td>${cs.phone || '<span style="color: #ccc;">N/A</span>'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `}
        </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const allSevaRequests = [];
  attendees.forEach(a => {
    const reqs = a.requestedSevas || [];
    reqs.forEach(rs => {
      allSevaRequests.push({
        ...rs,
        attendeeUid: a.id,
        attendeeName: a.userName,
        attendeeStatus: a.status
      });
    });
  });

  const fmtTimestamp = (ts) => {
    if (!ts) return "";
    const date = typeof ts.toDate === "function" ? ts.toDate() : ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
    return date.toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const sortAttendeesByTime = (list) => {
    return [...list].sort((a, b) => {
      const timeA = a.registeredAt?.seconds || (a.registeredAt ? new Date(a.registeredAt).getTime() / 1000 : 0);
      const timeB = b.registeredAt?.seconds || (b.registeredAt ? new Date(b.registeredAt).getTime() / 1000 : 0);
      return timeA - timeB;
    });
  };

  const handleSevaMapChange = (sevaId, personId) => {
    setSevaMapping(p => ({ ...p, [sevaId]: personId }));
  };

  const toggleGuestSelect = (guestId) => {
    setSelectedGuests(p => {
      const next = p.includes(guestId) ? p.filter(id => id !== guestId) : [...p, guestId];
      setSevaMapping(mapping => {
        const nextMapping = { ...mapping };
        Object.entries(nextMapping).forEach(([sId, pId]) => {
          if (pId === guestId) {
            delete nextMapping[sId];
          }
        });
        return nextMapping;
      });
      return next;
    });
  };

  const markAtt = async () => {
    if (!user) { notify("Please login to register", "err"); nav("login"); return; }
    if (myAtt) { notify("Already registered", "err"); return; }
    setBusy(true);
    try {
      const guestsCount = selectedGuests.length;
      const primaryAttendee = { id: user.uid, name: profile?.name || user.displayName, isPrimary: true };
      const guestAttendees = (profile?.guests || [])
        .filter(g => selectedGuests.includes(g.id))
        .map(g => ({ id: g.id, name: g.name, isPrimary: false, relationship: g.relationship }));
      const fullAttendeesList = [primaryAttendee, ...guestAttendees];
      const mappedSevas = Object.entries(sevaMapping)
        .filter(([_, personId]) => !!personId)
        .map(([sevaId, personId]) => {
          let personName = "";
          if (personId === user.uid) {
            personName = profile?.name || user.displayName;
          } else {
            const gst = (profile?.guests || []).find(g => g.id === personId);
            personName = gst ? gst.name : "Guest";
          }
          return {
            sevaId,
            personId,
            personName,
            status: "pending"
          };
        });
      const registerAttendanceFn = httpsCallable(functions, "registerAttendance");
      await registerAttendanceFn({
        satsangId,
        guests: guestsCount,
        userName: profile?.name || user.displayName,
        userEmail: user.email,
        userPhone: profile?.phone || "",
        requestedSevas: mappedSevas,
        attendeesList: fullAttendeesList
      });
      const isWaitlist = left < 1 + guestsCount;
      const localState = {
        guests: guestsCount,
        status: isWaitlist ? "waitlisted" : "pending",
        requestedSevas: mappedSevas,
        attendeesList: fullAttendeesList
      };
      setMyAtt(localState);
      setSevaMapping({});
      setSelectedGuests([]);
      onRefresh();
      if (isWaitlist) {
        notify("Jai Guruji! Placed on Waitlist (Satsang over capacity) 🙏");
      } else {
        notify("Jai Guruji! Attendance request submitted (pending approval) 🙏");
      }
    } catch (e) { notify(e.message, "err"); }
    setBusy(false);
  };

  const approveAtt = async (attendeeUid) => {
    setBusy(true);
    try {
      const confirmAttendanceFn = httpsCallable(functions, "confirmAttendance");
      await confirmAttendanceFn({ satsangId, attendeeUid });
      notify("Attendance request confirmed successfully! 🙏");
      getAttendees(satsangId).then(setAt).catch(() => { });
      onRefresh();
    } catch (e) {
      notify(e.message, "err");
    }
    setBusy(false);
  };

  const declineAtt = async (attendeeUid) => {
    setBusy(true);
    try {
      const declineAttendanceFn = httpsCallable(functions, "declineAttendance");
      await declineAttendanceFn({ satsangId, attendeeUid });
      notify("Request declined and moved to waitlist. 🙏");
      getAttendees(satsangId).then(setAt).catch(() => { });
      onRefresh();
    } catch (e) {
      notify(e.message, "err");
    }
    setBusy(false);
  };

  const handleConfirmSeva = async (attendeeUid, sevaId, personId) => {
    setBusy(true);
    try {
      const confirmSevaFn = httpsCallable(functions, "confirmSeva");
      await confirmSevaFn({ satsangId, attendeeUid, sevaId, personId });
      notify("Seva role confirmed successfully! 🙏");
      getAttendees(satsangId).then(setAt).catch(() => { });
      onRefresh();
    } catch (e) {
      notify(e.message, "err");
    }
    setBusy(false);
  };

  const handleDeclineSeva = async (attendeeUid, sevaId, personId) => {
    setBusy(true);
    try {
      const declineSevaFn = httpsCallable(functions, "declineSeva");
      await declineSevaFn({ satsangId, attendeeUid, sevaId, personId });
      notify("Seva request declined. 🙏");
      getAttendees(satsangId).then(setAt).catch(() => { });
      onRefresh();
    } catch (e) {
      notify(e.message, "err");
    }
    setBusy(false);
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 32px" }}>
      <button onClick={() => nav("find")} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 14, padding: "0 0 20px", display: "block" }}>← Back to search</button>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: "32px 36px", marginBottom: 32 }}>
        {s.status === "cancelled" && (
          <div style={{
            background: "rgba(224,107,16,0.1)",
            border: `1px solid ${C.saffron}`,
            color: C.saffron,
            borderRadius: 8,
            padding: "12px 16px",
            marginBottom: 20,
            fontWeight: "bold",
            textAlign: "center",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 8,
            fontSize: 15
          }}>
            ⚠️ This Satsang has been cancelled.
          </div>
        )}
        {s.isPrivate && (
          <div style={{
            background: "linear-gradient(135deg, rgba(39, 14, 3, 0.9) 0%, rgba(26, 8, 0, 0.95) 100%)",
            border: `1px solid ${C.gold}`,
            borderRadius: 10,
            padding: "16px 20px",
            marginBottom: 20,
            boxShadow: "0 4px 15px rgba(212,151,42,0.15)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 18 }}>🔒</span>
              <strong style={{ color: C.gold, fontSize: 15 }}>Private & Invite-Only Satsang</strong>
            </div>
            <p style={{ color: C.cream, fontSize: 13, lineHeight: 1.6, margin: 0 }}>
              This is a private, invite-only Satsang shared directly with you. Please do not share this page or invitation details with other Sangat members without the host's knowledge and permission. Let's keep the sanctity and capacity limits of this private Darbar respected.
            </p>
          </div>
        )}
        <div style={{ fontSize: 10, color: C.gold, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 10, fontFamily: "sans-serif", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {s.isPrivate ? (
            <span style={{ 
              background: "rgba(224,107,16,0.15)", 
              color: C.saffron, 
              border: `1px solid ${C.saffron}`, 
              fontSize: 9, 
              fontWeight: "bold", 
              padding: "2px 8px", 
              borderRadius: 12, 
              fontFamily: "sans-serif",
              display: "inline-flex",
              alignItems: "center",
              gap: 4
            }}>
              🔒 Private
            </span>
          ) : (
            (isHost || isAdmin) && (
              <span style={{ 
                background: "rgba(76,130,80,0.15)", 
                color: "#7db87f", 
                border: "1px solid rgba(76,130,80,0.4)", 
                fontSize: 9, 
                fontWeight: "bold", 
                padding: "2px 8px", 
                borderRadius: 12, 
                fontFamily: "sans-serif",
                display: "inline-flex",
                alignItems: "center",
                gap: 4
              }}>
                🌍 Public
              </span>
            )
          )}

          {(isHost || isAdmin) && (
            <button
              onClick={handleToggleVisibility}
              disabled={busy}
              style={{
                background: s.isPrivate ? "rgba(212,151,42,0.1)" : "rgba(224,107,16,0.1)",
                border: s.isPrivate ? `1px solid ${C.gold}` : `1px solid ${C.saffron}`,
                color: s.isPrivate ? C.gold : C.saffron,
                borderRadius: 12,
                padding: "2px 8px",
                fontSize: 9,
                fontWeight: "bold",
                cursor: "pointer",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                transition: "all 0.2s",
                outline: "none"
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = s.isPrivate ? "rgba(212,151,42,0.2)" : "rgba(224,107,16,0.2)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = s.isPrivate ? "rgba(212,151,42,0.1)" : "rgba(224,107,16,0.1)";
              }}
            >
              {s.isPrivate ? "Make Public" : "Make Private"}
            </button>
          )}

          <span>{fmtDate(s.date)} · {fmtTime(s.time)}</span>
        </div>
        <h2 style={{ fontSize: 32, fontWeight: 700, color: C.cream, margin: "0 0 10px" }}>{s.title}</h2>
        <div style={{ fontSize: 14, color: C.muted, marginBottom: 14, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span>📍 </span>
          {shouldHideAddress ? (
            <>
              <span style={{ position: "relative", display: "inline-block" }}>
                <span 
                  onClick={() => setShowAddressTooltip(!showAddressTooltip)}
                  onMouseEnter={() => setShowAddressTooltip(true)}
                  onMouseLeave={() => setShowAddressTooltip(false)}
                  style={{ 
                    filter: "blur(5px)", 
                    userSelect: "none", 
                    cursor: "help", 
                    background: "rgba(255,255,255,0.08)", 
                    padding: "2px 8px", 
                    borderRadius: 4,
                    color: C.muted,
                    fontSize: 13,
                    transition: "background 0.2s"
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.15)"}
                  onMouseOut={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
                >
                  Street Address
                </span>
                {showAddressTooltip && (
                  <div style={{
                    position: "absolute",
                    bottom: "135%",
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: C.card,
                    border: `1px solid ${C.gold}`,
                    color: C.cream,
                    padding: "10px 14px",
                    borderRadius: 8,
                    fontSize: 12,
                    lineHeight: 1.5,
                    whiteSpace: "normal",
                    width: 250,
                    zIndex: 999,
                    boxShadow: "0 6px 20px rgba(0,0,0,0.6)",
                    textAlign: "center",
                    textTransform: "none",
                    letterSpacing: "normal"
                  }}>
                    Full address is only visible after your attendance request is approved. 🙏
                  </div>
                )}
              </span>
              <span>, {s.city} {s.postcode}</span>
            </>
          ) : (
            <span>
              {[s.addressLine1 || s.address, s.addressLine2, s.addressLine3].filter(Boolean).join(', ')}, {s.city} {s.postcode}
            </span>
          )}
        </div>
        {s.description && <p style={{ fontSize: 15, color: "#c0a060", lineHeight: 1.8, marginBottom: 22 }}>{s.description}</p>}
        <div style={{ display: "flex", gap: 28, marginBottom: 22, flexWrap: "wrap" }}>
          {[["Attending", `${s.attendeeCount || 0}/${s.maxAttendees}`, false], ["Spots Left", left, left < 20], ["Seva Roles", Object.keys(s.sevas || {}).length, false]].map(([l, v, h]) => (
            <div key={l} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: h ? C.saffron : C.gold }}>{v}</div>
              <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "sans-serif" }}>{l}</div>
            </div>
          ))}
        </div>
        {s.organizerName && <div style={{ padding: "12px 16px", background: "rgba(255,255,255,0.03)", borderRadius: 8, fontSize: 14, color: C.muted }}>
          Hosted by <strong style={{ color: C.gold }}>{s.organizerName}</strong>
          {s.organizerEmail && <> · <a href={`mailto:${s.organizerEmail}`} style={{ color: C.gold }}>{s.organizerEmail}</a></>}
          {s.organizerPhone && <> · {s.organizerPhone}</>}
        </div>}
      </div>

      {/* Interactive Map Section */}
      {s.latitude && s.longitude && (
        <SatsangMapDetail 
          lat={s.latitude} 
          lng={s.longitude} 
          shouldHideAddress={shouldHideAddress} 
          addressStr={[s.addressLine1 || s.address, s.addressLine2, s.addressLine3].filter(Boolean).join(', ')}
        />
      )}

      {/* Attendance Form */}
      {!isHost && (
        <>
          {s.status !== "upcoming" && (
            <div style={{
              background: s.status === "completed" ? "rgba(245,232,208,0.05)" : "rgba(224,107,16,0.05)",
              border: `1px solid ${s.status === "completed" ? "rgba(245,232,208,0.3)" : C.saffron}`,
              borderRadius: 12,
              padding: "20px 24px",
              color: s.status === "completed" ? "#f5e8d0" : C.saffron,
              fontSize: 16,
              fontWeight: 600,
              textAlign: "center",
              marginBottom: 20
            }}>
              {s.status === "completed"
                ? <>🌹 This Satsang has concluded. Registrations are closed.</>
                : <>⚠️ This Satsang has been cancelled. Registrations are closed.</>
              }
            </div>
          )}

          {s.status === "upcoming" ? (
            !user ? (
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "28px 32px", textAlign: "center" }}>
                <p style={{ color: C.gold, fontSize: 16, fontWeight: 600, margin: "0 0 16px" }}>Join Guruji's Sangat to register for this Satsang</p>
                <p style={{ color: C.muted, fontSize: 14, margin: "0 0 20px 0", lineHeight: 1.5 }}>
                  Please login or create an account to register your attendance, select guests, and request Seva roles.
                </p>
                <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                  <Btn onClick={() => nav("login")}>Login →</Btn>
                  <Btn onClick={() => nav("register")} ghost>Create Account</Btn>
                </div>
              </div>
            ) : !myAtt ? (
              <div>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: C.cream, marginBottom: 18 }}>Register Attendance</h3>
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "24px 28px" }}>
                  
                  {/* Collapsible Guests Panel */}
                  <div style={{ marginBottom: 18 }}>
                    <button
                      type="button"
                      onClick={() => setShowGuestsPanel(p => !p)}
                      style={{
                        background: showGuestsPanel ? "rgba(255,255,255,0.03)" : "none",
                        border: `1px solid ${showGuestsPanel ? C.gold : C.border}`,
                        borderRadius: 10,
                        width: "100%",
                        padding: "14px 18px",
                        textAlign: "left",
                        color: C.cream,
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontSize: 15,
                        fontWeight: 700,
                        outline: "none"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div>
                          <span>Accompanying Guests & Family</span>
                          {selectedGuests.length > 0 && (
                            <span style={{ marginLeft: 8, color: C.gold, fontSize: 13, fontWeight: "bold" }}>
                              ({selectedGuests.length} selected)
                            </span>
                          )}
                        </div>
                      </div>
                      <span style={{ fontSize: 14, transform: showGuestsPanel ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .2s", color: C.muted }}>▼</span>
                    </button>

                    <div className={`panel-collapse ${showGuestsPanel ? "open" : ""}`}>
                      <div className="panel-collapse-inner" style={{ paddingTop: 14 }}>
                        <div style={{ background: "rgba(0,0,0,0.15)", borderRadius: 10, padding: "16px 20px", border: `1px solid rgba(255,255,255,0.03)` }}>
                          {(!profile?.guests || profile.guests.length === 0) ? (
                            <div style={{ background: "rgba(212,151,42,0.03)", border: `1px dashed rgba(212,151,42,0.25)`, borderRadius: 10, padding: "16px 20px" }}>
                              <p style={{ color: C.muted, fontSize: 13, lineHeight: 1.6, margin: "0 0 10px", fontStyle: "italic" }}>
                                🙏 Want to bring someone along? Satsang is always more beautiful when shared with loved ones. If you would like to bring family, children, or friends along, please register them in your Profile first and then select them here.
                              </p>
                              <button
                                onClick={() => nav("profile")}
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: C.gold,
                                  fontSize: 13,
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  padding: 0,
                                  textDecoration: "underline"
                                }}
                              >
                                👉 Manage Guests in Profile
                              </button>
                            </div>
                          ) : (
                            <div>
                              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
                                {profile.guests.map(g => {
                                  const isSelected = selectedGuests.includes(g.id);
                                  return (
                                    <label key={g.id} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", color: isSelected ? C.cream : C.muted, fontSize: 14, transition: "color 0.2s" }}>
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => toggleGuestSelect(g.id)}
                                        style={{ accentColor: C.gold, cursor: "pointer" }}
                                      />
                                      <strong>{g.name}</strong> <span style={{ fontSize: 12, color: C.muted }}>({g.relationship})</span>
                                    </label>
                                  );
                                })}
                              </div>
                              <div style={{ fontSize: 12, color: C.muted, display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid rgba(255,255,255,0.03)`, paddingTop: 10 }}>
                                <span>✨ You can always add or update your regular guests in your Profile page.</span>
                                <button
                                  onClick={() => nav("profile")}
                                  style={{
                                    background: "none",
                                    border: "none",
                                    color: C.gold,
                                    fontSize: 12,
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    padding: 0,
                                    textDecoration: "underline"
                                  }}
                                >
                                  Manage Guests
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Collapsible Seva Panel */}
                  {Object.keys(s.sevas || {}).length > 0 && (
                    <div style={{ marginBottom: 22 }}>
                      <button
                        type="button"
                        onClick={() => setShowSevaPanel(p => !p)}
                        style={{
                          background: showSevaPanel ? "rgba(255,255,255,0.03)" : "none",
                          border: `1px solid ${showSevaPanel ? C.gold : C.border}`,
                          borderRadius: 10,
                          width: "100%",
                          padding: "14px 18px",
                          textAlign: "left",
                          color: C.cream,
                          cursor: "pointer",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontSize: 15,
                          fontWeight: 700,
                          outline: "none"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div>
                            <span>Offer Seva (Service)</span>
                            {Object.values(sevaMapping).filter(Boolean).length > 0 && (
                              <span style={{ marginLeft: 8, color: C.gold, fontSize: 13, fontWeight: "bold" }}>
                                ({Object.values(sevaMapping).filter(Boolean).length} roles selected)
                              </span>
                            )}
                          </div>
                        </div>
                        <span style={{ fontSize: 14, transform: showSevaPanel ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .2s", color: C.muted }}>▼</span>
                      </button>

                      <div className={`panel-collapse ${showSevaPanel ? "open" : ""}`}>
                        <div className="panel-collapse-inner" style={{ paddingTop: 14 }}>
                          <div style={{ background: "rgba(0,0,0,0.15)", borderRadius: 10, padding: "16px 20px", border: `1px solid rgba(255,255,255,0.03)` }}>
                            <Label style={{ marginBottom: 4, display: "block" }}>Request Seva Roles</Label>
                            <p style={{ color: C.muted, fontSize: 12, marginBottom: 12 }}>You can assign specific Seva roles to yourself or any of your attending guests (excluding children).</p>
                            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                              {Object.values(s.sevas || {}).map(sv => {
                                const m = STANDARD_SEVAS.find(x => x.id === sv.id);
                                const full = (sv.opted || 0) >= sv.needed;
                                const selectedPersonId = sevaMapping[sv.id] || "";

                                const options = [
                                  { id: user.uid, name: `${profile?.name || user.displayName} (Me)` }
                                ];
                                (profile?.guests || []).forEach(g => {
                                  if (selectedGuests.includes(g.id) && !g.isChild) {
                                    options.push({ id: g.id, name: `${g.name} (Guest)` });
                                  }
                                });
                                return (
                                  <div key={sv.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.01)", border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", flexWrap: "wrap", gap: 10 }}>
                                    <div>
                                      <span style={{ color: C.cream, fontSize: 14, fontWeight: 600 }}>{m?.name}</span>
                                      <span style={{ color: C.muted, fontSize: 12, marginLeft: 8 }}>({sv.opted || 0} of {sv.needed} filled)</span>
                                    </div>
                                    <select
                                      disabled={full && !selectedPersonId}
                                      value={selectedPersonId}
                                      onChange={(e) => handleSevaMapChange(sv.id, e.target.value)}
                                      style={{
                                        background: C.bg,
                                        border: `1px solid ${C.border}`,
                                        color: selectedPersonId ? C.gold : C.muted,
                                        padding: "6px 10px",
                                        borderRadius: 6,
                                        fontSize: 13,
                                        cursor: "pointer",
                                        outline: "none"
                                      }}
                                    >
                                      <option value="">-- No Seva --</option>
                                      {options.map(opt => (
                                        <option key={opt.id} value={opt.id}>{opt.name}</option>
                                      ))}
                                    </select>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {left <= 0 && <div style={{ color: C.saffron, fontSize: 13, marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>⚠️ Note: This Satsang is currently over capacity. Registering will place you on the Waitlist.</div>}
                  <Btn onClick={markAtt} disabled={busy} full>{busy ? "Registering…" : "Register Attendance →"}</Btn>
                </div>
              </div>
            ) : (
              <div style={{ background: myAtt.status === "confirmed" ? "rgba(76,130,80,0.1)" : myAtt.status === "waitlisted" ? "rgba(224,107,16,0.1)" : "rgba(212,151,42,0.1)", border: `1px solid ${myAtt.status === "confirmed" ? "rgba(76,130,80,0.35)" : myAtt.status === "waitlisted" ? "rgba(224,107,16,0.3)" : "rgba(212,151,42,0.35)"}`, borderRadius: 10, padding: "18px 24px", color: myAtt.status === "confirmed" ? "#7db87f" : myAtt.status === "waitlisted" ? C.saffron : C.gold, fontSize: 16, fontWeight: 600 }}>
                {myAtt.status === "confirmed" && <>✓ Attendance Confirmed! Shukrana Guruji 🙏</>}
                {myAtt.status === "waitlisted" && <>⚠️ Waitlisted (Satsang is currently over capacity. Your request has been placed on the Waitlist.)</>}
                {(!myAtt.status || myAtt.status === "pending") && <>⏳ Attendance Pending Host Approval</>}
                {myAtt.guests > 0 ? ` (with ${myAtt.guests} guest(s))` : ""}
                {mySevaNames.length > 0 && ` · Seva Confirmed: ${mySevaNames.join(", ")}`}
                {(!myAtt.status || myAtt.status === "pending" || myAtt.status === "waitlisted") && myAtt.requestedSevas?.length > 0 && ` · Requested Seva: ${formatRequestedSevas(myAtt.requestedSevas)}`}
              </div>
            )
          ) : (
            myAtt && (
              <div style={{ background: myAtt.status === "confirmed" ? "rgba(76,130,80,0.1)" : myAtt.status === "waitlisted" ? "rgba(224,107,16,0.1)" : "rgba(212,151,42,0.1)", border: `1px solid ${myAtt.status === "confirmed" ? "rgba(76,130,80,0.35)" : myAtt.status === "waitlisted" ? "rgba(224,107,16,0.3)" : "rgba(212,151,42,0.35)"}`, borderRadius: 10, padding: "18px 24px", color: myAtt.status === "confirmed" ? "#7db87f" : myAtt.status === "waitlisted" ? C.saffron : C.gold, fontSize: 16, fontWeight: 600 }}>
                {myAtt.status === "confirmed" && <>✓ Attendance Confirmed! Shukrana Guruji 🙏</>}
                {myAtt.status === "waitlisted" && <>⚠️ Waitlisted (Satsang is currently over capacity. Your request has been placed on the Waitlist.)</>}
                {(!myAtt.status || myAtt.status === "pending") && <>⏳ Attendance Pending Host Approval</>}
                {myAtt.guests > 0 ? ` (with ${myAtt.guests} guest(s))` : ""}
                {mySevaNames.length > 0 && ` · Seva Confirmed: ${mySevaNames.join(", ")}`}
                {(!myAtt.status || myAtt.status === "pending" || myAtt.status === "waitlisted") && myAtt.requestedSevas?.length > 0 && ` · Requested Seva: ${formatRequestedSevas(myAtt.requestedSevas)}`}
              </div>
            )
          )}
        </>
      )}

      {/* Host / Admin Sangat Attendance Management */}
      {(isHost || isAdmin) && (
        <div style={{ marginTop: 40, borderTop: `1px solid ${C.border}`, paddingTop: 30 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: C.cream, margin: 0 }}>Sangat Attendance & Seva Management</h3>
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => setShowInviteModal(true)}
                style={{
                  background: C.gold,
                  border: "none",
                  color: C.bg,
                  borderRadius: 8,
                  padding: "8px 16px",
                  fontSize: 13,
                  fontWeight: "bold",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                ✨ Generate Invitation Card
              </button>
              {s.status === "upcoming" && (
                <button
                  onClick={async () => {
                    if (window.confirm("Are you sure you want to cancel this Satsang? Approved attendees will be notified automatically via email. 🙏")) {
                      setBusy(true);
                      try {
                        await cancelSatsang(satsangId);
                        notify("Satsang has been cancelled. 🙏");
                        if (onRefresh) onRefresh();
                      } catch (e) {
                        notify(e.message, "err");
                      }
                      setBusy(false);
                    }
                  }}
                  disabled={busy}
                  style={{
                    background: "none",
                    border: `1px solid ${C.saffron}`,
                    color: C.saffron,
                    borderRadius: 8,
                    padding: "8px 16px",
                    fontSize: 13,
                    fontWeight: "bold",
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                >
                  ⚠️ Cancel Satsang
                </button>
              )}
            </div>
          </div>

          {/* Segmented Tab Controls */}
          <div style={{ display: "flex", gap: 16, borderBottom: `1px solid ${C.border}`, marginBottom: 24 }}>
            <button
              onClick={() => setActiveTab("attendance")}
              style={{
                background: "none",
                border: "none",
                borderBottom: activeTab === "attendance" ? `2px solid ${C.gold}` : "2px solid transparent",
                color: activeTab === "attendance" ? C.gold : C.muted,
                padding: "10px 16px",
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s",
                outline: "none"
              }}
            >
              Attendance Registry
            </button>
            <button
              onClick={() => setActiveTab("seva")}
              style={{
                background: "none",
                border: "none",
                borderBottom: activeTab === "seva" ? `2px solid ${C.gold}` : "2px solid transparent",
                color: activeTab === "seva" ? C.gold : C.muted,
                padding: "10px 16px",
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s",
                outline: "none"
              }}
            >
              Seva Registry
            </button>
          </div>

          {/* TAB A: Attendance Registry */}
          {activeTab === "attendance" && (
            <div>
              {/* 1. Pending Requests */}
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "20px 24px", marginBottom: 20 }}>
                <h4 style={{ fontSize: 15, fontWeight: 700, color: C.gold, margin: "0 0 12px", display: "flex", justifyContent: "space-between" }}>
                  <span>⏳ Pending Requests</span>
                  <span style={{ fontSize: 12, color: C.muted }}>{attendees.filter(a => a.status === "pending" || !a.status).length} pending</span>
                </h4>
                {attendees.filter(a => a.status === "pending" || !a.status).length === 0 ? (
                  <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>No pending requests.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {sortAttendeesByTime(attendees.filter(a => a.status === "pending" || !a.status)).map(a => {
                      const guestNamesText = a.attendeesList && a.attendeesList.filter(p => !p.isPrimary).map(p => p.name).join(", ");
                      return (
                        <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: `1px solid rgba(92,42,10,0.25)`, paddingBottom: 12, flexWrap: "wrap", gap: 10 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                              <strong style={{ color: C.cream, fontSize: 14 }}>{a.userName}</strong>
                              <span style={{ color: C.muted, fontSize: 12 }}>
                                ({a.guests} guest(s){guestNamesText ? `: ${guestNamesText}` : ""})
                              </span>
                              <span style={{ color: C.muted, fontSize: 11, background: "rgba(255,255,255,0.05)", padding: "2px 8px", borderRadius: 4, display: "inline-flex", alignItems: "center", gap: 4, fontFamily: "sans-serif" }}>
                                🕒 Applied: {fmtTimestamp(a.registeredAt)}
                              </span>
                            </div>
                            <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>📞 {a.userPhone} &nbsp;|&nbsp; ✉️ {a.userEmail}</div>
                            {renderAttendeeSevaStatus(a)}
                          </div>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={() => approveAtt(a.id)} disabled={busy} style={{ background: C.gold, color: C.bg, border: "none", cursor: "pointer", fontSize: 12, fontWeight: "bold", padding: "6px 14px", borderRadius: 6 }}>
                              Approve
                            </button>
                            <button onClick={() => declineAtt(a.id)} disabled={busy} style={{ background: "none", border: `1px solid ${C.saffron}`, color: C.saffron, cursor: "pointer", fontSize: 12, fontWeight: "bold", padding: "6px 14px", borderRadius: 6 }}>
                              Decline
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 2. Waitlisted Requests */}
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "20px 24px", marginBottom: 20 }}>
                <h4 style={{ fontSize: 15, fontWeight: 700, color: C.saffron, margin: "0 0 12px", display: "flex", justifyContent: "space-between" }}>
                  <span>⚠️ Waitlisted Sangat</span>
                  <span style={{ fontSize: 12, color: C.muted }}>{attendees.filter(a => a.status === "waitlisted").length} waitlisted</span>
                </h4>
                {attendees.filter(a => a.status === "waitlisted").length === 0 ? (
                  <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>No waitlisted requests.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {sortAttendeesByTime(attendees.filter(a => a.status === "waitlisted")).map(a => {
                      const guestNamesText = a.attendeesList && a.attendeesList.filter(p => !p.isPrimary).map(p => p.name).join(", ");
                      return (
                        <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: `1px solid rgba(92,42,10,0.25)`, paddingBottom: 12, flexWrap: "wrap", gap: 10 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                              <strong style={{ color: C.cream, fontSize: 14 }}>{a.userName}</strong>
                              <span style={{ color: C.muted, fontSize: 12 }}>
                                ({a.guests} guest(s){guestNamesText ? `: ${guestNamesText}` : ""})
                              </span>
                              <span style={{ color: C.muted, fontSize: 11, background: "rgba(255,255,255,0.05)", padding: "2px 8px", borderRadius: 4, display: "inline-flex", alignItems: "center", gap: 4, fontFamily: "sans-serif" }}>
                                🕒 Applied: {fmtTimestamp(a.registeredAt)}
                              </span>
                            </div>
                            <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>📞 {a.userPhone} &nbsp;|&nbsp; ✉️ {a.userEmail}</div>
                            {renderAttendeeSevaStatus(a)}
                          </div>
                          <div>
                            <button onClick={() => approveAtt(a.id)} disabled={busy} style={{ background: C.gold, color: C.bg, border: "none", cursor: "pointer", fontSize: 12, fontWeight: "bold", padding: "6px 14px", borderRadius: 6 }}>
                              Confirm
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 3. Confirmed Sangat */}
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "20px 24px" }}>
                <h4 style={{ fontSize: 15, fontWeight: 700, color: "#7db87f", margin: "0 0 12px", display: "flex", justifyContent: "space-between" }}>
                  <span>✓ Confirmed Sangat</span>
                  <span style={{ fontSize: 12, color: C.muted }}>{attendees.filter(a => a.status === "confirmed").length} confirmed</span>
                </h4>
                {attendees.filter(a => a.status === "confirmed").length === 0 ? (
                  <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>No confirmed attendees yet.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {sortAttendeesByTime(attendees.filter(a => a.status === "confirmed")).map(a => {
                      const guestNamesText = a.attendeesList && a.attendeesList.filter(p => !p.isPrimary).map(p => p.name).join(", ");
                      return (
                        <div key={a.id} style={{ borderBottom: `1px solid rgba(92,42,10,0.25)`, paddingBottom: 12 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                                <strong style={{ color: C.cream, fontSize: 14 }}>{a.userName}</strong>
                                <span style={{ color: C.muted, fontSize: 12 }}>
                                  ({a.guests} guest(s){guestNamesText ? `: ${guestNamesText}` : ""})
                                </span>
                                <span style={{ color: C.muted, fontSize: 11, background: "rgba(255,255,255,0.05)", padding: "2px 8px", borderRadius: 4, display: "inline-flex", alignItems: "center", gap: 4, fontFamily: "sans-serif" }}>
                                  🕒 Applied: {fmtTimestamp(a.registeredAt)}
                                </span>
                              </div>
                              <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>📞 {a.userPhone} &nbsp;|&nbsp; ✉️ {a.userEmail}</div>
                              {renderAttendeeSevaStatus(a)}
                            </div>
                            <div>
                              <button
                                onClick={() => declineAtt(a.id)}
                                disabled={busy}
                                style={{
                                  background: "none",
                                  border: `1px solid ${C.saffron}`,
                                  color: C.saffron,
                                  cursor: "pointer",
                                  fontSize: 12,
                                  fontWeight: "bold",
                                  padding: "6px 14px",
                                  borderRadius: 6
                                }}
                              >
                                Cancel Attendance
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB B: Seva Registry */}
          {activeTab === "seva" && (
            <div>
              {/* Summary of Roles */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
                {Object.values(s.sevas || {}).map(sv => {
                  const m = STANDARD_SEVAS.find(x => x.id === sv.id);
                  const filled = sv.opted || 0;
                  const needed = sv.needed || 0;
                  const isFull = filled >= needed;
                  return (
                    <div key={sv.id} style={{ background: C.card, border: `1px solid ${isFull ? "rgba(76,130,80,0.3)" : C.border}`, borderRadius: 10, padding: "14px 18px", position: "relative" }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.cream, marginBottom: 4 }}>
                        {m?.icon} {m?.name}
                      </div>
                      <div style={{ fontSize: 12, color: isFull ? "#7db87f" : C.muted }}>
                        {filled} of {needed} Confirmed
                      </div>
                      {isFull && <span style={{ position: "absolute", top: 12, right: 12, fontSize: 10, background: "rgba(76,130,80,0.15)", color: "#7db87f", padding: "2px 6px", borderRadius: 4, fontFamily: "sans-serif" }}>FULL</span>}
                    </div>
                  );
                })}
              </div>

              {/* Master Seva Requests Table */}
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "24px 28px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
                  <h4 style={{ fontSize: 16, fontWeight: 700, color: C.gold, margin: 0 }}>Seva Allocation Registry</h4>
                  <button
                    onClick={exportSevaSheet}
                    style={{
                      background: "rgba(212,151,42,0.1)",
                      border: `1px solid ${C.gold}`,
                      color: C.gold,
                      padding: "6px 14px",
                      borderRadius: 6,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.2s"
                    }}
                    onMouseEnter={(e) => e.target.style.background = "rgba(212,151,42,0.2)"}
                    onMouseLeave={(e) => e.target.style.background = "rgba(212,151,42,0.1)"}
                  >
                    📥 Export Seva Sheet
                  </button>
                </div>

                {allSevaRequests.length === 0 ? (
                  <p style={{ color: C.muted, fontSize: 14, margin: 0, textAlign: "center", padding: "20px 0" }}>No Seva requests have been made for this Satsang.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {allSevaRequests.map((req, idx) => {
                      const sName = STANDARD_SEVAS.find(x => x.id === req.sevaId)?.name || req.sevaId;
                      const label = req.personId === req.attendeeUid ? req.personName : `${req.personName} (Guest of ${req.attendeeName})`;

                      const isAttendanceConfirmed = req.attendeeStatus === 'confirmed';
                      const isSevaConfirmed = req.status === 'confirmed';
                      const isSevaDeclined = req.status === 'declined';
                      const isSevaPending = req.status === 'pending' || !req.status;
                      return (
                        <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid rgba(92,42,10,0.25)`, paddingBottom: 12, flexWrap: "wrap", gap: 12 }}>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                              <strong style={{ color: C.cream, fontSize: 14 }}>{label}</strong>
                              <span style={{
                                background: isAttendanceConfirmed ? "rgba(76,130,80,0.15)" : "rgba(224,107,16,0.15)",
                                color: isAttendanceConfirmed ? "#7db87f" : C.saffron,
                                fontSize: 10,
                                padding: "2px 8px",
                                borderRadius: 4,
                                fontFamily: "sans-serif",
                                fontWeight: 600
                              }}>
                                {isAttendanceConfirmed ? "✓ Attendance Confirmed" : "⏳ Attendance Pending"}
                              </span>
                            </div>
                            <div style={{ color: C.gold, fontSize: 13, marginTop: 4, fontWeight: 500 }}>
                              Role: {sName}
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                            <span style={{
                              color: isSevaConfirmed ? "#7db87f" : isSevaDeclined ? C.saffron : C.gold,
                              fontSize: 12,
                              fontWeight: 600
                            }}>
                              {isSevaConfirmed ? "✓ Confirmed" : isSevaDeclined ? "❌ Declined" : "⏳ Pending Approval"}
                            </span>
                            <div style={{ display: "flex", gap: 8 }}>
                              {isSevaPending && (
                                <>
                                  <button
                                    onClick={() => handleConfirmSeva(req.attendeeUid, req.sevaId, req.personId)}
                                    disabled={busy || !isAttendanceConfirmed}
                                    style={{
                                      background: isAttendanceConfirmed ? C.gold : C.muted,
                                      color: C.bg,
                                      border: "none",
                                      cursor: isAttendanceConfirmed ? "pointer" : "not-allowed",
                                      fontSize: 12,
                                      fontWeight: "bold",
                                      padding: "6px 14px",
                                      borderRadius: 6,
                                      opacity: isAttendanceConfirmed ? 1 : 0.5
                                    }}
                                    title={!isAttendanceConfirmed ? "Confirm attendance first to allocate" : ""}
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleDeclineSeva(req.attendeeUid, req.sevaId, req.personId)}
                                    disabled={busy}
                                    style={{
                                      background: "none",
                                      border: `1px solid ${C.saffron}`,
                                      color: C.saffron,
                                      cursor: "pointer",
                                      fontSize: 12,
                                      fontWeight: "bold",
                                      padding: "6px 14px",
                                      borderRadius: 6
                                    }}
                                  >
                                    Decline
                                  </button>
                                </>
                              )}
                              {isSevaConfirmed && (
                                <button
                                  onClick={() => handleDeclineSeva(req.attendeeUid, req.sevaId, req.personId)}
                                  disabled={busy}
                                  style={{
                                    background: "none",
                                    border: `1px solid ${C.saffron}`,
                                    color: C.saffron,
                                    cursor: "pointer",
                                    fontSize: 12,
                                    fontWeight: "bold",
                                    padding: "6px 14px",
                                    borderRadius: 6
                                  }}
                                >
                                  Unassign
                                </button>
                              )}
                              {isSevaDeclined && (
                                <button
                                  onClick={() => handleConfirmSeva(req.attendeeUid, req.sevaId, req.personId)}
                                  disabled={busy || !isAttendanceConfirmed}
                                  style={{
                                    background: isAttendanceConfirmed ? C.gold : C.muted,
                                    color: C.bg,
                                    border: "none",
                                    cursor: isAttendanceConfirmed ? "pointer" : "not-allowed",
                                    fontSize: 12,
                                    fontWeight: "bold",
                                    padding: "6px 14px",
                                    borderRadius: 6,
                                    opacity: isAttendanceConfirmed ? 1 : 0.5
                                  }}
                                  title={!isAttendanceConfirmed ? "Confirm attendance first to allocate" : ""}
                                >
                                  Re-approve
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {showInviteModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.85)",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
          backdropFilter: "blur(4px)"
        }}>
          <div style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 16,
            padding: 28,
            maxWidth: 900,
            width: "100%",
            maxHeight: "90vh",
            overflowY: "auto",
            display: "flex",
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 28,
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)"
          }}>
            {/* Column 1: Live Preview */}
            <div style={{ 
              display: "flex", 
              flexDirection: "column", 
              alignItems: "center", 
              flex: "1 1 400px", 
              justifyContent: "center",
              width: "100%", 
              overflow: "hidden" 
            }}>
              <style>{`
                .invite-card-wrapper {
                  transform: scale(1);
                  transform-origin: center top;
                  transition: all 0.3s ease;
                }
                @media (max-width: 500px) {
                  .invite-card-wrapper {
                    transform: scale(0.8);
                    margin-bottom: -120px;
                  }
                }
                @media (max-width: 400px) {
                  .invite-card-wrapper {
                    transform: scale(0.7);
                    margin-bottom: -180px;
                  }
                }
                @media (max-width: 350px) {
                  .invite-card-wrapper {
                    transform: scale(0.6);
                    margin-bottom: -240px;
                  }
                }
              `}</style>
              <div className="invite-card-wrapper">
                {/* The exportable invitation card */}
                <div 
                  ref={inviteRef}
                  style={{
                    width: 360,
                    height: 640,
                    minWidth: 360,
                    minHeight: 640,
                    background: "#150600",
                    borderRadius: "16px",
                    boxSizing: "border-box",
                    position: "relative",
                    overflow: "hidden",
                    boxShadow: "0 20px 40px rgba(0,0,0,0.6)"
                  }}
                >
                  {/* Background Image (Contains pre-rendered gradient background, mandalas, Om/Ek Onkar, gold frame, and roses) */}
                  <img 
                    src={inviteBg} 
                    alt="Invite Background" 
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      zIndex: 1,
                      pointerEvents: "none"
                    }}
                  />

                  {/* Guruji Maharaj's Portrait positioned precisely inside the ornate gold frame */}
                  <img 
                    src={gurujiPortrait} 
                    alt="Guruji Maharaj" 
                    style={{
                      position: "absolute",
                      left: 124,
                      top: 137,
                      width: 112,
                      height: 104,
                      borderRadius: "50%",
                      objectFit: "cover",
                      zIndex: 2,
                      pointerEvents: "none"
                    }}
                  />

                  {/* Header Mantra centered between Om and Ek Onkar symbols */}
                  <div style={{
                    position: "absolute",
                    left: 50,
                    right: 50,
                    top: 68,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    zIndex: 2,
                    pointerEvents: "none"
                  }}>
                    <span style={{ color: "#ffe082", fontSize: 8.5, fontWeight: "bold", letterSpacing: "0.05em", textAlign: "center", fontFamily: "'Cinzel', serif", textShadow: "1px 1px 2px rgba(0,0,0,0.8)" }}>
                      || Om Namah Shivay Shivji Sada Sahay ||
                    </span>
                    <span style={{ color: "#ffe082", fontSize: 8.5, fontWeight: "bold", letterSpacing: "0.05em", textAlign: "center", fontFamily: "'Cinzel', serif", marginTop: 2, textShadow: "1px 1px 2px rgba(0,0,0,0.8)" }}>
                      || Om Namah Shivay Guruji Sada Sahay ||
                    </span>
                  </div>

                  {/* Event Title positioned above the first separator line */}
                  <div style={{
                    position: "absolute",
                    left: 20,
                    right: 20,
                    top: 272,
                    height: 38,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 2,
                    pointerEvents: "none"
                  }}>
                    <span style={{
                      fontFamily: "'Cinzel', serif",
                      fontSize: getResponsiveTitleFontSize(currentTitleText),
                      color: "#ffe082",
                      fontWeight: "bold",
                      letterSpacing: "0.08em",
                      textShadow: "2px 2px 4px rgba(0,0,0,0.9)",
                      textAlign: "center"
                    }}>
                      {currentTitleText}
                    </span>
                  </div>

                  {/* Invitation Text positioned between the first and second separator lines (narrow width to not overlap motifs) */}
                  <div style={{
                    position: "absolute",
                    left: 70,
                    right: 70,
                    top: 320,
                    height: 85,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 2,
                    pointerEvents: "none"
                  }}>
                    <span style={{
                      fontFamily: "'Great Vibes', cursive",
                      fontSize: getResponsiveMessageFontSize(currentInviteText),
                      color: "#ffe082",
                      textAlign: "center",
                      lineHeight: 1.3,
                      textShadow: "2px 2px 4px rgba(0,0,0,0.9)"
                    }}>
                      "{currentInviteText}"
                    </span>
                  </div>

                  {/* Date line — independently positioned */}
                  <div style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: 432,
                    textAlign: "center",
                    fontSize: 11,
                    color: "#ffe082",
                    fontWeight: "bold",
                    fontFamily: "'Cinzel', serif",
                    letterSpacing: "0.04em",
                    textShadow: "1px 1px 1px rgba(0,0,0,0.8)",
                    whiteSpace: "nowrap",
                    zIndex: 2,
                    pointerEvents: "none"
                  }}>
                    📅 {new Date(s.date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </div>

                  {/* Time line — independently positioned */}
                  <div style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: 449,
                    textAlign: "center",
                    fontSize: 11,
                    color: "#ffe082",
                    fontWeight: "bold",
                    fontFamily: "'Cinzel', serif",
                    letterSpacing: "0.04em",
                    textShadow: "1px 1px 1px rgba(0,0,0,0.8)",
                    whiteSpace: "nowrap",
                    zIndex: 2,
                    pointerEvents: "none"
                  }}>
                    ⏰ {s.time}
                  </div>

                  {/* Address positioned between the third and fourth separator lines (with pin icon, responsive text size, and postcode included) */}
                  <div style={{
                    position: "absolute",
                    left: 20,
                    right: 20,
                    top: 478,
                    height: 32,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 2,
                    pointerEvents: "none"
                  }}>
                    <span style={{
                      fontSize: getResponsiveAddressFontSize(`${[s.addressLine1 || s.address, s.addressLine2, s.addressLine3].filter(Boolean).join(', ')}, ${s.city} ${s.postcode || ""}`),
                      color: "#ffe082",
                      fontFamily: "'Cinzel', serif",
                      fontWeight: "bold",
                      letterSpacing: "0.03em",
                      textAlign: "center",
                      textShadow: "1px 1px 1px rgba(0,0,0,0.8)",
                      lineHeight: 1.2,
                      wordBreak: "break-word",
                      overflowWrap: "anywhere"
                    }}>
                      📍 {[s.addressLine1 || s.address, s.addressLine2, s.addressLine3].filter(Boolean).join(', ')}, {s.city} {s.postcode || ""}
                    </span>
                  </div>

                  {/* Shukrana Text positioned below the fourth separator line */}
                  <div style={{
                    position: "absolute",
                    left: 20,
                    right: 20,
                    top: 518,
                    height: 27,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 2,
                    pointerEvents: "none"
                  }}>
                    <span style={{
                      fontSize: 16,
                      color: "#ffe082",
                      fontStyle: "italic",
                      fontFamily: "'Great Vibes', cursive",
                      fontWeight: "bold",
                      textShadow: "2px 2px 4px rgba(0,0,0,0.9)",
                      textAlign: "center"
                    }}>
                      Jai Guruji, Shukrana Guruji 🙏
                    </span>
                  </div>

                  {/* QR Code positioned on the bottom right above the roses */}
                  <div style={{
                    position: "absolute",
                    right: 24,
                    bottom: 20,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                    zIndex: 2
                  }}>
                    <div style={{
                      background: "#ffffff",
                      padding: 3,
                      borderRadius: 6,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 4px 10px rgba(0,0,0,0.3)"
                    }}>
                      <QRCodeCanvas value={invitePageUrl} size={48} bgColor="#ffffff" fgColor="#150600" />
                    </div>
                    <span style={{
                      fontSize: 6,
                      color: "#ffe082",
                      fontWeight: "bold",
                      fontFamily: "var(--font-body)",
                      letterSpacing: "0.02em",
                      textShadow: "1px 1px 1px rgba(0,0,0,0.8)"
                    }}>
                      Scan me to attend
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Column 2: Controls */}
            <div style={{ flex: "1 1 300px", display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <h3 style={{ margin: "0 0 4px 0", color: C.cream, fontSize: 18, fontWeight: 700 }}>Customize Satsang Invitation</h3>
                <p style={{ margin: 0, color: C.muted, fontSize: 13 }}>Tailor the invitation message for sharing with the Sangat.</p>
              </div>

              {/* Event Title Preset Select */}
              <div>
                <Label>Event Title</Label>
                <select 
                  value={titlePreset}
                  onChange={(e) => setTitlePreset(Number(e.target.value))}
                  style={{
                    width: "100%",
                    background: C.card,
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    padding: "10px 12px",
                    color: C.cream,
                    fontSize: 14,
                    fontFamily: "var(--font-body)",
                    outline: "none",
                    cursor: "pointer"
                  }}
                >
                  <option value={2}>Satsang Title ("{s?.title || "Satsang"}")</option>
                  <option value={0}>Guruji's Satsang</option>
                  <option value={1}>Guruji Ka Satsang</option>
                  <option value={99}>Custom Title...</option>
                </select>
              </div>

              {/* Custom Title Input */}
              {titlePreset === 99 && (
                <div>
                  <Label>Custom Event Title</Label>
                  <input
                    type="text"
                    value={customTitleText}
                    onChange={(e) => setCustomTitleText(e.target.value.slice(0, 50))}
                    placeholder="Enter custom event title..."
                    style={{
                      width: "100%",
                      background: C.card,
                      border: `1px solid ${C.border}`,
                      borderRadius: 8,
                      padding: "10px 12px",
                      color: C.cream,
                      fontSize: 14,
                      fontFamily: "var(--font-body)",
                      outline: "none",
                      boxSizing: "border-box"
                    }}
                  />
                </div>
              )}

              {/* Preset Select */}
              <div>
                <Label>Invite Message Preset</Label>
                <select 
                  value={invitePreset}
                  onChange={(e) => setInvitePreset(Number(e.target.value))}
                  style={{
                    width: "100%",
                    background: C.card,
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    padding: "10px 12px",
                    color: C.cream,
                    fontSize: 14,
                    fontFamily: "var(--font-body)",
                    outline: "none",
                    cursor: "pointer"
                  }}
                >
                  <option value={0}>Option 1 (Traditional/Polite)</option>
                  <option value={1}>Option 2 (Warm Family Invite)</option>
                  <option value={2}>Option 3 (Divine Evening invitation)</option>
                  <option value={99}>Custom Message...</option>
                </select>
              </div>

              {/* Custom Text Area */}
              {invitePreset === 99 && (
                <div>
                  <Label>Custom Invite Message</Label>
                  <textarea
                    value={customInviteText}
                    onChange={(e) => setCustomInviteText(e.target.value.slice(0, 150))}
                    placeholder="Type your own custom invitation text here (max 150 chars)..."
                    rows={4}
                    style={{
                      width: "100%",
                      background: C.card,
                      border: `1px solid ${C.border}`,
                      borderRadius: 8,
                      padding: "10px 12px",
                      color: C.cream,
                      fontSize: 14,
                      fontFamily: "var(--font-body)",
                      outline: "none",
                      resize: "none",
                      boxSizing: "border-box"
                    }}
                  />
                  <div style={{ textAlign: "right", fontSize: 11, color: C.muted, marginTop: 4 }}>
                    {customInviteText.length}/150 characters
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: "auto" }}>
                <Btn onClick={handleDownloadInvite} disabled={generatingImage} full>
                  {generatingImage ? "Generating Flyer..." : "💾 Download Invite Image"}
                </Btn>
                <button
                  onClick={handleWhatsAppShare}
                  style={{
                    width: "100%",
                    background: "#25D366",
                    border: "none",
                    borderRadius: 8,
                    padding: "12px",
                    color: "#1a0800",
                    fontWeight: "bold",
                    fontSize: 14,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    textAlign: "center"
                  }}
                >
                  💬 Share directly to WhatsApp
                </button>
                <button
                  onClick={() => setShowInviteModal(false)}
                  style={{
                    width: "100%",
                    background: "none",
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    padding: "12px",
                    color: C.muted,
                    fontSize: 14,
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                >
                  Close / Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Long-press save instruction modal for mobile device fallbacks */}
      {generatedImageUrl && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.92)",
          zIndex: 1100,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
          backdropFilter: "blur(8px)"
        }}>
          <div style={{
            background: "linear-gradient(135deg, rgba(39, 14, 3, 0.95) 0%, rgba(26, 8, 0, 0.98) 100%)",
            border: `2px solid ${C.gold}`,
            borderRadius: 16,
            padding: 24,
            maxWidth: 340,
            width: "100%",
            textAlign: "center",
            boxShadow: "0 15px 35px rgba(0,0,0,0.6)",
            position: "relative"
          }}>
            <button 
              onClick={() => setGeneratedImageUrl("")}
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                background: "rgba(255,255,255,0.08)",
                border: "none",
                color: C.gold,
                borderRadius: "50%",
                width: 28,
                height: 28,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "bold",
                fontSize: 14,
                outline: "none"
              }}
            >
              ✕
            </button>
            <h4 style={{ color: C.gold, fontSize: 18, fontWeight: 700, marginBottom: 8, fontFamily: "var(--font-headings)", letterSpacing: "0.02em" }}>
              Save to Photos
            </h4>
            <p style={{ color: C.cream, fontSize: 12, lineHeight: 1.5, marginBottom: 16 }}>
              👇 <strong>Press and hold (long-press)</strong> the card below and choose <strong>"Save Image"</strong> or <strong>"Add to Photos"</strong>.
            </p>
            <div style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: 18,
              background: "rgba(0,0,0,0.3)",
              padding: 10,
              borderRadius: 10,
              border: `1px solid rgba(212,151,42,0.15)`
            }}>
              <img 
                src={generatedImageUrl} 
                alt="Generated Satsang Invite" 
                style={{
                  width: "100%",
                  maxWidth: 240,
                  height: "auto",
                  borderRadius: 8,
                  boxShadow: "0 4px 15px rgba(0,0,0,0.5)",
                  pointerEvents: "auto"
                }} 
              />
            </div>
            <Btn onClick={() => setGeneratedImageUrl("")} full>Done</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

function SatsangMapDetail({ lat, lng, shouldHideAddress, addressStr }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (!window.L || !mapContainerRef.current) return;

    if (mapRef.current) {
      mapRef.current.remove();
    }

    // Offset slightly if hidden so center is not exactly on the location
    const centerLat = shouldHideAddress ? lat + 0.0007 * (Math.sin(lat * 1000) || 0.5) : lat;
    const centerLng = shouldHideAddress ? lng + 0.0007 * (Math.cos(lng * 1000) || -0.5) : lng;

    const map = window.L.map(mapContainerRef.current, {
      center: [centerLat, centerLng],
      zoom: shouldHideAddress ? 14 : 16,
      zoomControl: true,
      scrollWheelZoom: false
    });

    mapRef.current = map;

    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" style="color: #d4972a;">OpenStreetMap</a> contributors'
    }).addTo(map);

    if (shouldHideAddress) {
      window.L.circle([centerLat, centerLng], {
        color: "#e06b10",
        fillColor: "#e06b10",
        fillOpacity: 0.15,
        radius: 500,
        weight: 1
      }).addTo(map);
    } else {
      const satsangIcon = window.L.divIcon({
        className: "custom-satsang-marker",
        html: `<div style="background: #e06b10; border: 2px solid #270e03; width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 12px #e06b10; font-size: 10px;">🌹</div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9]
      });
      window.L.marker([lat, lng], { icon: satsangIcon }).addTo(map)
        .bindPopup(`<strong style="color: #d4972a;">Satsang Location</strong><br/><span style="font-size:12px;">${addressStr}</span>`);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [lat, lng, shouldHideAddress, addressStr]);

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, marginBottom: 32 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: C.cream, margin: "0 0 12px" }}>
        {shouldHideAddress ? "📍 Approximate Area (approx. 500m radius)" : "📍 Satsang Location"}
      </h3>
      <div 
        ref={mapContainerRef} 
        style={{ 
          height: 250, 
          borderRadius: 12, 
          border: `1px solid ${C.border}`,
          overflow: "hidden",
          position: "relative",
          zIndex: 1
        }} 
      />
      {shouldHideAddress && (
        <div style={{ fontSize: 11, color: C.muted, marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
          <span>ℹ️</span> Full address and precise pin will be shown after your registration is approved.
        </div>
      )}
    </div>
  );
}
