import { useEffect, useState } from "react";
import { getToken, getUser, setUser } from "../auth/authUtils";
import { queryClient } from "../api/queryClient";

export type CurrentUser = {
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
    if (!token) {
      setUserState(null);
      return;
    }

    if (user) return;

    queryClient
      .fetchQuery<CurrentUser>(
        ["user", "me"],
        async () => {
          const res = await fetch("/api/accounts/me/", {
            headers: { Authorization: `Token ${token}` },
          });
          if (!res.ok) throw new Error("Failed to load profile");
          const data = (await res.json()) as CurrentUser;
          setUser(data);
          return data;
        },
        { staleTime: 600000 } // Cache user profile for 10 minutes
      )
      .then((data) => setUserState(data))
      .catch(() => setUserState(null));
  }, [user]);

  return user;
};

export default useCurrentUser;
