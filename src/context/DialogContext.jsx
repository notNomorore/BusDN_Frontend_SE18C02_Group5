import React, { createContext, useState, useContext } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';

const DialogContext = createContext();

export const useDialog = () => {
    return useContext(DialogContext);
};

export const DialogProvider = ({ children }) => {
    const [open, setOpen] = useState(false);
    const [options, setOptions] = useState({
        title: '',
        message: '',
        confirmText: 'OK',
        cancelText: '',
        onConfirm: null,
        onCancel: null,
    });

    const showAlert = (message, title = 'Thông báo') => {
        setOptions({
            title,
            message,
            confirmText: 'Đóng',
            cancelText: '',
            onConfirm: null,
            onCancel: null,
        });
        setOpen(true);
    };

    const showConfirm = (message, onConfirm, title = 'Xác nhận', onCancel = null) => {
        setOptions({
            title,
            message,
            confirmText: 'Đồng ý',
            cancelText: 'Hủy',
            onConfirm,
            onCancel,
        });
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        if (options.onCancel) {
            options.onCancel();
        }
    };

    const handleConfirm = () => {
        setOpen(false);
        if (options.onConfirm) {
            options.onConfirm();
        }
    };

    return (
        <DialogContext.Provider value={{ showAlert, showConfirm }}>
            {children}
            <Dialog open={open} onClose={handleClose} PaperProps={{ sx: { borderRadius: 3, minWidth: 300 } }}>
                <DialogTitle sx={{ fontWeight: 'bold' }}>{options.title}</DialogTitle>
                <DialogContent>
                    <DialogContentText>{options.message}</DialogContentText>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    {options.cancelText && (
                        <Button onClick={handleClose} color="inherit" sx={{ textTransform: 'none', fontWeight: 600 }}>
                            {options.cancelText}
                        </Button>
                    )}
                    <Button onClick={handleConfirm} variant="contained" sx={{ bgcolor: '#23a983', '&:hover': { bgcolor: '#1d8f6f' }, textTransform: 'none', fontWeight: 600, borderRadius: 2 }}>
                        {options.confirmText}
                    </Button>
                </DialogActions>
            </Dialog>
        </DialogContext.Provider>
    );
};
