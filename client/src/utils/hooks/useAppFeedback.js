import { useCallback } from "react";
import { useDispatch } from "react-redux";
import { showAlert } from "../../store/slices/uiSlice";

export const useAppFeedback = () => {
  const dispatch = useDispatch();

  const push = useCallback(
    ({ type = "info", title = "", message, duration = 5000 }) => {
      dispatch(
        showAlert({
          type,
          title,
          message,
          duration,
        }),
      );
    },
    [dispatch],
  );

  const success = useCallback(
    (message, title = "") => push({ type: "success", title, message }),
    [push],
  );

  const error = useCallback(
    (message, title = "") => push({ type: "error", title, message }),
    [push],
  );

  const warning = useCallback(
    (message, title = "") => push({ type: "warning", title, message }),
    [push],
  );

  const info = useCallback(
    (message, title = "") => push({ type: "info", title, message }),
    [push],
  );

  return {
    push,
    success,
    error,
    warning,
    info,
  };
};
