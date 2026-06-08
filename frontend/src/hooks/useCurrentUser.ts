import { useEffect, useState } from "react";
import { getToken, getUser, setUser } from "../auth/authUtils";

type CurrentUser = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  school_id?: number | null;
};

const useCurrentUser = () => {
  const [user, setUserState] = useState<CurrentUser | null>(() => getUser());

  useEffect(() => {
    const token = getToken();
    if (!token || user) return;

    const load = async () => {
      try {
        const res = await fetch("/api/accounts/me/", {
          headers: {
            Authorization: `Token ${token}`,
          },
        });
        if (!res.ok) throw new Error("Failed to load profile");
        const data = (await res.json()) as CurrentUser;
        setUser(data);
        setUserState(data);
      } catch {
        setUserState(null);
      }
    };

    load();
  }, [user]);

  return user;
};

export default useCurrentUser;
