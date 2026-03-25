import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import api from '../utils/api';
import { findMatchingMonthlyPass } from '../utils/monthlyPass';

const DEFAULT_PASS_ERROR = 'Không tìm thấy vé tháng trong tài khoản của bạn.';
const DEFAULT_QR_ERROR = 'Không thể tải mã QR cho vé này.';

export default function useMonthlyPassDetails({
  passId = '',
  token,
  enabled = true,
  fallbackQuery = {},
}) {
  const [pass, setPass] = useState(null);
  const [profileName, setProfileName] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const currentObjectUrlRef = useRef('');

  const fallbackKey = useMemo(() => JSON.stringify(fallbackQuery || {}), [fallbackQuery]);
  const fallbackCriteria = useMemo(() => JSON.parse(fallbackKey), [fallbackKey]);

  const revokeQrUrl = useCallback(() => {
    if (currentObjectUrlRef.current) {
      URL.revokeObjectURL(currentObjectUrlRef.current);
      currentObjectUrlRef.current = '';
    }
  }, []);

  const refresh = useCallback(() => {
    setRefreshKey((value) => value + 1);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadPassDetails() {
      if (!enabled) {
        if (active) {
          setLoading(false);
        }
        return;
      }

      if (!token) {
        if (active) {
          setPass(null);
          setProfileName('');
          setQrUrl('');
          setError('Đăng nhập lại để xem vé tháng này.');
          setLoading(false);
        }
        return;
      }

      if (active) {
        setLoading(true);
        setError('');
        setPass(null);
        setQrUrl('');
      }
      revokeQrUrl();

      try {
        let passRequest;
        if (passId) {
          passRequest = api.get('/api/user/passes/monthly').then(async (listResponse) => {
            const matchedFromList = findMatchingMonthlyPass(listResponse?.data?.myPasses || [], {
              ...fallbackCriteria,
              passId,
            });

            if (matchedFromList?._id) {
              return {
                ...listResponse,
                data: {
                  ...listResponse.data,
                  pass: matchedFromList,
                },
              };
            }

            return api.get(`/api/user/passes/monthly/${passId}`).catch(async (detailError) => {
              const status = Number(detailError?.response?.status || 0);
              if (status !== 404) {
                throw detailError;
              }

              // Backward compatibility: older running backends may not expose the
              // dedicated detail endpoint yet, but still provide the list endpoint.
              return listResponse;
            });
          });
        } else {
          passRequest = api.get('/api/user/passes/monthly');
        }

        const [passResult, profileResult] = await Promise.allSettled([
          passRequest,
          api.get('/api/user/profile'),
        ]);

        if (!active) return;

        if (profileResult.status === 'fulfilled') {
          setProfileName(profileResult.value?.data?.user?.fullName || '');
        }

        if (passResult.status !== 'fulfilled') {
          throw passResult.reason;
        }

        const responseData = passResult.value?.data || {};
        const resolvedPass = responseData.pass
          ? responseData.pass
          : findMatchingMonthlyPass(responseData.myPasses || [], {
            ...fallbackCriteria,
            passId: passId || fallbackCriteria.passId,
          });

        if (!resolvedPass?._id) {
          setError(DEFAULT_PASS_ERROR);
          setLoading(false);
          return;
        }

        setPass(resolvedPass);

        try {
          const qrResponse = await api.get(`/api/user/passes/monthly/${resolvedPass._id}/qr`, {
            responseType: 'blob',
          });

          if (!active) return;

          const nextQrUrl = URL.createObjectURL(qrResponse.data);
          currentObjectUrlRef.current = nextQrUrl;
          setQrUrl(nextQrUrl);
        } catch (qrError) {
          if (!active) return;
          setError(qrError?.response?.data?.message || DEFAULT_QR_ERROR);
        }
      } catch (requestError) {
        if (!active) return;
        setError(requestError?.response?.data?.message || DEFAULT_PASS_ERROR);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadPassDetails();

    return () => {
      active = false;
      revokeQrUrl();
    };
  }, [enabled, fallbackCriteria, fallbackKey, passId, refreshKey, revokeQrUrl, token]);

  return {
    pass,
    profileName,
    qrUrl,
    loading,
    error,
    refresh,
  };
}
