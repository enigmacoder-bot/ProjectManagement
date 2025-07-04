import { useEffect, useState, Fragment, useRef } from "react"; // Added useRef
import React, { useCallback } from 'react';
import axiosInstance from '../axiosInstance';
import useClickOutside from '../hooks/useClickOutside'; // Import the new hook
import { formatCurrency, formatAmount, parseCurrency, convertToFullAmount, formatAmountForInput, parseInputAmount } from "../utils/currencyUtils";

const DeliveryCompletionModal = ({ onClose, deliverable, projectId, onSuccessfulSubmit }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    setSelectedFile(file);
    setUploadError('');
    setValidationErrors(prev => ({ ...prev, file: '' }));

    // Validate file type and size
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf', 
                           'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                           'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
      
      if (!allowedTypes.includes(file.type)) {
        setValidationErrors(prev => ({ 
          ...prev, 
          file: 'File type not allowed. Please upload JPG, PNG, PDF, DOC, DOCX, XLS, or XLSX files.' 
        }));
        return;
      }

      // Check file size (10MB limit)
      const maxSize = 10 * 1024 * 1024; // 10MB in bytes
      if (file.size > maxSize) {
        setValidationErrors(prev => ({ 
          ...prev, 
          file: 'File size too large. Please upload a file smaller than 10MB.' 
        }));
        return;
      }
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    // Clear previous errors
    setUploadError('');
    setValidationErrors({});

    // Validate file
    if (!selectedFile) {
      setValidationErrors({ file: 'Please select a delivery note document to upload.' });
      return;
    }
    if (!deliverable.id) {
      setUploadError('Missing deliverable ID.');
      return;
    }

    // Check if there are any validation errors
    if (Object.values(validationErrors).some(error => error !== '')) {
      return;
    }

    setUploading(true);
    setUploadError('');
    const formData = new FormData();
    formData.append('evidenceFile', selectedFile); // must match backend    formData.append('document_type', 'DELIVERY_NOTE');
    // All other metadata can be added here if needed
    try {
      const response = await axiosInstance.post(`/deliverables/${deliverable.id}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      if (response.data.document) {
        // After successful delivery note upload, create completion approval task for PMO
        try {
          await axiosInstance.post(`/deliverables/${deliverable.id}/create-completion-approval-task`);
          console.log('Completion approval task created successfully for PMO');
        } catch (taskError) {
          console.error('Error creating completion approval task:', taskError);
          // Don't fail the entire process if task creation fails
        }
        
        setUploading(false);
        if (onSuccessfulSubmit) onSuccessfulSubmit(response.data.document);
        onClose();
      } else {
        setUploading(false);
        setUploadError(response.data.message || 'Upload failed. Please try again.');
      }
    } catch (error) {
      setUploading(false);
      setUploadError(error.response?.data?.message || error.message || 'An error occurred during upload.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-center items-center">
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Delivery Completion</h2>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Delivery name</label>
            <input type="text" value={deliverable.name} disabled className="mt-1 block w-full border border-gray-300 rounded-md p-2 bg-gray-100" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Upload signed delivery note</label>
            <input 
              type="file" 
              onChange={handleFileChange} 
              className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx"
            />
            {selectedFile && <p className="text-sm text-gray-600 mt-1">Selected: {selectedFile.name}</p>}
            {validationErrors.file && (
              <p className="text-red-500 text-sm mt-1">{validationErrors.file}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Allowed formats: JPG, PNG, PDF, DOC, DOCX, XLS, XLSX (max 10MB)
            </p>
          </div>
          {uploadError && <p className="text-red-500 text-sm">{uploadError}</p>}
          <button 
            type="submit" 
            disabled={uploading || Object.values(validationErrors).some(error => error !== '')} 
            className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400"
          >
            {uploading ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </form>
    </div>
  );
};

const DeliveryInvoiceModal = ({ onClose, deliverable, onSuccessfulSubmit, projectId }) => {
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [isFullAmount, setIsFullAmount] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [paymentPercentage, setPaymentPercentage] = useState(deliverable.payment_percentage || 0); // Or derive from remaining value
  const [validationErrors, setValidationErrors] = useState({});
  const initialPaymentPercentage = deliverable.payment_percentage || 0;

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    setSelectedFile(file);
    setUploadError('');
    setValidationErrors(prev => ({ ...prev, file: '' }));

    // Validate file type and size for invoice documents
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf', 
                           'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                           'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
      
      if (!allowedTypes.includes(file.type)) {
        setValidationErrors(prev => ({ 
          ...prev, 
          file: 'File type not allowed. Please upload JPG, PNG, PDF, DOC, DOCX, XLS, or XLSX files.' 
        }));
        return;
      }

      // Check file size (10MB limit)
      const maxSize = 10 * 1024 * 1024; // 10MB in bytes
      if (file.size > maxSize) {
        setValidationErrors(prev => ({ 
          ...prev, 
          file: 'File size too large. Please upload a file smaller than 10MB.' 
        }));
        return;
      }
    }
  };

  // Validation function for invoice amount
  const validateInvoiceAmount = (amount) => {
    const errors = {};
    const numericAmount = parseFloat(amount);
    const remainingValue = (deliverable.budget || 0) - (deliverable.invoiced || 0);

    if (!amount || amount === '') {
      errors.invoiceAmount = 'Invoice amount is required';
    } else if (isNaN(numericAmount)) {
      errors.invoiceAmount = 'Please enter a valid number';
    } else if (numericAmount <= 0) {
      errors.invoiceAmount = 'Invoice amount must be greater than 0';
    } else if (numericAmount > remainingValue) {
      errors.invoiceAmount = `Invoice amount cannot exceed remaining value (${formatCurrency(remainingValue, 'SAR', false)})`;
    }

    return errors;
  };

  // Validation function for payment percentage
  const validatePaymentPercentage = (percentage) => {
    const errors = {};
    const numericPercentage = parseFloat(percentage);

    if (isNaN(numericPercentage)) {
      errors.paymentPercentage = 'Please enter a valid percentage';
    } else if (numericPercentage < 0) {
      errors.paymentPercentage = 'Payment percentage cannot be negative';
    } else if (numericPercentage > 100) {
      errors.paymentPercentage = 'Payment percentage cannot exceed 100%';
    } else if (numericPercentage < initialPaymentPercentage) {
      errors.paymentPercentage = `Payment percentage cannot be reduced below ${initialPaymentPercentage}%`;
    }

    return errors;
  };

  // Enhanced invoice amount change handler
  const handleInvoiceAmountChange = (e) => {
    const value = parseInputAmount(e.target.value);
    setInvoiceAmount(value);
    
    const errors = validateInvoiceAmount(value);
    setValidationErrors(prev => ({ ...prev, invoiceAmount: errors.invoiceAmount || '' }));
  };

  // Enhanced payment percentage change handler
  const handlePaymentPercentageChange = (e) => {
    const value = e.target.value;
    const numericValue = Math.max(initialPaymentPercentage, Math.min(100, Number(value) || initialPaymentPercentage));
    
    setPaymentPercentage(numericValue);
    
    const errors = validatePaymentPercentage(numericValue);
    setValidationErrors(prev => ({ ...prev, paymentPercentage: errors.paymentPercentage || '' }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    // Clear previous errors
    setUploadError('');
    setValidationErrors({});

    // Validate all fields
    const invoiceErrors = !isFullAmount ? validateInvoiceAmount(invoiceAmount) : {};
    const paymentErrors = validatePaymentPercentage(paymentPercentage);
    
    const allErrors = { ...invoiceErrors, ...paymentErrors };

    if (!selectedFile) {
      allErrors.file = 'Please select an invoice document to upload.';
    }
    if (!deliverable.id) {
      allErrors.general = 'Missing deliverable ID.';
    }
    if (!invoiceAmount && !isFullAmount) {
      allErrors.invoiceAmount = 'Please enter an invoice amount or check Full Amount.';
    }

    if (Object.keys(allErrors).length > 0) {
      setValidationErrors(allErrors);
      if (allErrors.general) {
        setUploadError(allErrors.general);
      }
      return;
    }

    setUploading(true);
    setUploadError('');
    // Hardcode finalInvoiceAmount for testing
    const finalInvoiceAmount = 1000;
    const formData = new FormData();
    formData.append('evidenceFile', selectedFile); // must match backend
    formData.append('document_type', 'INVOICE');
    formData.append('invoice_amount', finalInvoiceAmount);    formData.append('related_payment_percentage', paymentPercentage);
    // All other metadata can be added here if needed
    try {
      const response = await axiosInstance.post(`/deliverables/${deliverable.id}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      if (response.data.document) {
        // After successful invoice upload, create approval task for PMO
        try {
          await axiosInstance.post(`/deliverables/${deliverable.id}/create-invoice-approval-task`);
          console.log('Invoice approval task created successfully for PMO');
        } catch (taskError) {
          console.error('Error creating invoice approval task:', taskError);
          // Don't fail the entire process if task creation fails
        }
        
        setUploading(false);
        if (onSuccessfulSubmit) onSuccessfulSubmit(response.data.document);
        onClose();
      } else {
        setUploading(false);
        setUploadError(response.data.message || 'Upload failed. Please try again.');
      }
    } catch (error) {
      setUploading(false);
      setUploadError(error.response?.data?.message || error.message || 'An error occurred during upload.');
    }
  };
    // Calculate remaining value for display
  const remainingValue = (deliverable.budget || 0) - (deliverable.invoiced || 0);

  const handleFullAmountChange = (e) => {
    setIsFullAmount(e.target.checked);
    setValidationErrors(prev => ({ ...prev, invoiceAmount: '' }));
    
    if (e.target.checked) {
      if (remainingValue <= 0) {
        setValidationErrors(prev => ({ 
          ...prev, 
          invoiceAmount: 'No remaining value available for invoicing' 
        }));
        return;
      }
      setInvoiceAmount(remainingValue.toString()); // Set invoice amount to remaining
      setPaymentPercentage(100); // If full amount, payment percentage becomes 100
    } else {
      // Optionally clear or revert invoiceAmount if unchecked
      setInvoiceAmount(''); 
      setPaymentPercentage(initialPaymentPercentage);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-center items-center">
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Delivery Invoice</h2>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Deliverable Name</label>
            <input type="text" value={deliverable.name} disabled className="mt-1 block w-full border border-gray-300 rounded-md p-2 bg-gray-100" />
          </div>          <div>
            <label className="block text-sm font-medium text-gray-700">Deliverable Remaining Value (SAR)</label>
            <input type="text" value={formatCurrency(remainingValue, 'SAR', false)} disabled className="mt-1 block w-full border border-gray-300 rounded-md p-2 bg-gray-100" />
          </div>
          <div>
            <label htmlFor="invoiceAmount" className="block text-sm font-medium text-gray-700">Invoice Amount (SAR)</label>
            <input 
              id="invoiceAmount"
              type="text" 
              value={formatAmountForInput(invoiceAmount)} 
              onChange={handleInvoiceAmountChange}
              disabled={isFullAmount}
              className={`mt-1 block w-full border rounded-md p-2 ${
                validationErrors.invoiceAmount ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter invoice amount (e.g., 100,000)"
            />
            {validationErrors.invoiceAmount && (
              <p className="text-red-500 text-sm mt-1">{validationErrors.invoiceAmount}</p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <input 
              type="checkbox" 
              id="fullAmount"
              checked={isFullAmount}
              onChange={handleFullAmountChange}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded" 
            />
            <label htmlFor="fullAmount" className="text-sm font-medium text-gray-700">Invoice Full Remaining Amount</label>
          </div>
          <div>
            <label htmlFor="paymentPercentage" className="block text-sm font-medium text-gray-700">
              Payment Percentage (%) 
              {initialPaymentPercentage > 0 && (
                <span className="text-gray-500 text-xs ml-1">(minimum: {initialPaymentPercentage}%)</span>
              )}
            </label>
            <input
              id="paymentPercentage"
              type="number"
              value={paymentPercentage}
              onChange={handlePaymentPercentageChange}
              className={`mt-1 block w-full border rounded-md p-2 ${
                validationErrors.paymentPercentage ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter payment percentage"
              max="100"
              min={initialPaymentPercentage}
            />
            {validationErrors.paymentPercentage && (
              <p className="text-red-500 text-sm mt-1">{validationErrors.paymentPercentage}</p>
            )}
          </div>
          <div>
            <label htmlFor="invoiceFile" className="block text-sm font-medium text-gray-700">Upload Invoice Document</label>
            <input 
              id="invoiceFile"
              type="file" 
              onChange={handleFileChange} 
              className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx"
            />
            {selectedFile && <p className="text-sm text-gray-600 mt-1">Selected: {selectedFile.name}</p>}
            {validationErrors.file && (
              <p className="text-red-500 text-sm mt-1">{validationErrors.file}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Allowed formats: JPG, PNG, PDF, DOC, DOCX, XLS, XLSX (max 10MB)
            </p>
          </div>
          {uploadError && <p className="text-red-500 text-sm">{uploadError}</p>}
          <button 
            type="submit" 
            disabled={uploading || Object.values(validationErrors).some(error => error !== '')}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400"
          >
            {uploading ? 'Submitting...' : 'Submit Invoice'}
          </button>
        </div>
      </form>
    </div>
  );
};

const DeliverableDetailsModal = ({ onClose, deliverable, projectId }) => {
  const [scopeEvidenceFile, setScopeEvidenceFile] = useState(null);
  const [uploadingScope, setUploadingScope] = useState(false);
  const [uploadErrorScope, setUploadErrorScope] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  const handleScopeFileChange = (event) => {
    const file = event.target.files[0];
    setScopeEvidenceFile(file);
    setUploadErrorScope('');
    setValidationErrors(prev => ({ ...prev, file: '' }));

    // Validate file type and size
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf', 
                           'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                           'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
      
      if (!allowedTypes.includes(file.type)) {
        setValidationErrors(prev => ({ 
          ...prev, 
          file: 'File type not allowed. Please upload JPG, PNG, PDF, DOC, DOCX, XLS, or XLSX files.' 
        }));
        return;
      }

      // Check file size (10MB limit)
      const maxSize = 10 * 1024 * 1024; // 10MB in bytes
      if (file.size > maxSize) {
        setValidationErrors(prev => ({ 
          ...prev, 
          file: 'File size too large. Please upload a file smaller than 10MB.' 
        }));
        return;
      }
    }
  };

  const handleScopeSubmit = async (event) => {
    event.preventDefault();
    
    // Clear previous errors
    setUploadErrorScope('');
    setValidationErrors({});

    // Validate file
    if (!scopeEvidenceFile) {
      setValidationErrors({ file: 'Please select a scope evidence document to upload.' });
      return;
    }

    // Check if there are any validation errors
    if (Object.values(validationErrors).some(error => error !== '')) {
      return;
    }

    setUploadingScope(true);
    setUploadErrorScope('');

    const formData = new FormData();
    formData.append('evidenceFile', scopeEvidenceFile);
    formData.append('document_type', 'SCOPE_EVIDENCE');
    formData.append('deliverable_id', deliverable.id);
    formData.append('project_id', projectId); // Add project_id to the form data

    try {
      const response = await axiosInstance.post(`/deliverables/${deliverable.id}/documents`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setUploadingScope(false);
      if (response.data.document) {
        // Handle successful upload, e.g., notify parent component
        onClose(); // Close modal on success
      } else {
        setUploadErrorScope(response.data.message || 'Upload failed. Please try again.');
      }
    } catch (error) {
      setUploadingScope(false);
      console.error('Upload error:', error);
      setUploadErrorScope(error.response?.data?.message || error.message || 'An error occurred during upload.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-center items-center">
      <form onSubmit={handleScopeSubmit} className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Upload Scope Evidence</h2>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Deliverable Name</label>
            <input type="text" value={deliverable.name} disabled className="mt-1 block w-full border border-gray-300 rounded-md p-2 bg-gray-100" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Upload Scope Evidence Document</label>
            <input 
              type="file" 
              onChange={handleScopeFileChange} 
              className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx"
            />
            {scopeEvidenceFile && <p className="text-sm text-gray-600 mt-1">Selected: {scopeEvidenceFile.name}</p>}
            {validationErrors.file && (
              <p className="text-red-500 text-sm mt-1">{validationErrors.file}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Allowed formats: JPG, PNG, PDF, DOC, DOCX, XLS, XLSX (max 10MB)
            </p>
          </div>
          {uploadErrorScope && <p className="text-red-500 text-sm">{uploadErrorScope}</p>}
          <button 
            type="submit" 
            disabled={uploadingScope || Object.values(validationErrors).some(error => error !== '')}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400"
          >
            {uploadingScope ? 'Uploading...' : 'Upload Document'}
          </button>
        </div>
      </form>
    </div>
  );
};

const ChangeRequestModal = ({ onClose, deliverable }) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-center items-center">
    <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md mx-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Apply for Change Request</h2>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="space-y-4">
        <p>Request changes for {deliverable.name}.</p>
        <textarea className="w-full h-32 border border-gray-300 rounded-md p-2" placeholder="Describe the change request"></textarea>
        <button className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">Submit Request</button>
      </div>
    </div>
  </div>
);

const ActionPopup = ({ onClose, onSelect, deliverable }) => (
  <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
    <div className="py-1">
      <button onClick={() => onSelect('completion', deliverable)} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Delivery Completion</button>
      <button onClick={() => onSelect('invoice', deliverable)} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Delivery Invoice</button>
      <button onClick={() => onSelect('dates', deliverable)} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Change Deliverable Dates</button>
      <button onClick={() => onSelect('details', deliverable)} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">View Deliverable Details</button>
      <button onClick={() => onSelect('changeRequest', deliverable)} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Apply for Change Request</button>
    </div>
  </div>
);

const ProjectDelivarablesTable = ({ data, columns = [], tableName, projectId }) => {
  const [openAccordion, setOpenAccordion] = useState(null);
  const [columnWidths, setColumnWidths] = useState({});
  const [resizingColumn, setResizingColumn] = useState(null);
  const [startX, setStartX] = useState(null);
  const [startWidth, setStartWidth] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ASC' });
  const [tableData, setTableData] = useState(() => {
    // Initialize data with proper progress field mapping
    return data.map(item => ({
      ...item,
      progress: item.progress || (item.scope_percentage ? parseInt(item.scope_percentage.toString().replace('%', '')) : 0)
    }));
  });
  const [showActionPopup, setShowActionPopup] = useState(null);
  const [selectedModal, setSelectedModal] = useState(null);
  const [selectedDeliverable, setSelectedDeliverable] = useState(null);
  const [progressUpdates, setProgressUpdates] = useState({});
  const [savingProgress, setSavingProgress] = useState({});

  useEffect(() => {
    const initialWidths = {};
    columns.forEach((column) => {
      initialWidths[column.dbColumn] = column.width || 150;
    });
    setColumnWidths(initialWidths);
  }, [columns]);
  // Fetch deliverables from server when projectId changes
  useEffect(() => {
    if (!projectId) return;
    const fetchDeliverables = async () => {
      try {
        const response = await axiosInstance.get(`/project-card/deliverables/${projectId}`);
        console.log('Fetched deliverables data:', response.data);
        
        // Ensure progress field is synced with scope_percentage if not present
        const processedData = response.data.map(item => ({
          ...item,
          progress: item.progress || (item.scope_percentage ? parseInt(item.scope_percentage.toString().replace('%', '')) : 0)
        }));
        
        setTableData(processedData);
      } catch (error) {
        console.error('Error fetching deliverables:', error);
      }
    };
    fetchDeliverables();
  }, [projectId]);

  // Update tableData when data prop changes
  useEffect(() => {
    const processedData = data.map(item => ({
      ...item,
      progress: item.progress || (item.scope_percentage ? parseInt(item.scope_percentage.toString().replace('%', '')) : 0)
    }));
    setTableData(processedData);
  }, [data]);

  const handleResizeStart = (e, columnId) => {
    e.preventDefault();
    setResizingColumn(columnId);
    setStartX(e.clientX);
    setStartWidth(columnWidths[columnId] || 150);
  };

  const handleResizeMove = (e) => {
    if (resizingColumn && startX !== null) {
      const diff = e.clientX - startX;
      const newWidth = Math.max(50, startWidth + diff);
      setColumnWidths((prev) => ({
        ...prev,
        [resizingColumn]: newWidth,
      }));
    }
  };

  const handleResizeEnd = () => {
    setResizingColumn(null);
    setStartX(null);
    setStartWidth(null);
  };

  useEffect(() => {
    const handleMouseMove = (e) => handleResizeMove(e);
    const handleMouseUp = () => handleResizeEnd();

    if (resizingColumn) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.classList.add('resize-active');
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.classList.remove('resize-active');
    };
  }, [resizingColumn, startX, startWidth, columnWidths]);

  const sortDataHandler = (key) => {
    const direction = sortConfig.key === key && sortConfig.direction === 'ASC' ? 'DESC' : 'ASC';
    setSortConfig({ key, direction });

    const sortedData = [...tableData].sort((a, b) => {
      if (a[key] < b[key]) return direction === 'ASC' ? -1 : 1;
      if (a[key] > b[key]) return direction === 'ASC' ? 1 : -1;
      return 0;
    });
    setTableData(sortedData);
  };

  const toggleAccordion = (index) => {
    setOpenAccordion(openAccordion === index ? null : index);
  };

  const handleEditClick = (item) => {
    console.log(`Editing item with id: ${item.id}`);
  };

  const handleDeleteClick = (id) => {
    console.log(`Deleting item with id: ${id}`);
    setTableData(tableData.filter(item => item.id !== id));
  };  // Scope change logic: if scope is set to 100, open delivery completion modal
  const handleScopeChange = (id, value) => {
    const numericValue = Math.max(0, Math.min(100, Math.round(Number(value) / 10) * 10));
    setProgressUpdates((prev) => ({
      ...prev,
      [id]: numericValue,
    }));
    // Also update the tableData to reflect the change immediately in both scope and progress columns
    setTableData(tableData.map(item =>
      item.id === id ? { 
        ...item, 
        scope_percentage: `${numericValue}%`
      } : item
    ));
  };
  const handleSaveProgress = async (id) => {
    setSavingProgress((prev) => ({ ...prev, [id]: true }));
    try {
      const progressValue = progressUpdates[id];
      
      // Make API call to save progress
      const response = await axiosInstance.put(`/deliverables/${id}/progress`, {
        scope_percentage: progressValue,
        progress_percentage: progressValue,
        status: progressValue === 100 ? 'COMPLETED' : 'IN_PROGRESS'
      });

      console.log(`Progress saved for deliverable ${id}: ${progressValue}%`);
        // Update UI optimistically - update both scope_percentage and progress
      setTableData(tableData.map(item =>
        item.id === id ? { 
          ...item, 
          scope_percentage: `${progressValue}%`,
          progress: progressValue // Also update the progress field to match the column definition
        } : item
      ));

      // Clear the progress update for this item since it's been saved
      setProgressUpdates((prev) => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });

      // If scope is set to 100, open delivery completion modal for this deliverable
      if (progressValue === 100) {
        const deliverable = tableData.find(item => item.id === id);
        setSelectedDeliverable(deliverable);
        setSelectedModal('completion');
      }

    } catch (error) {
      console.error('Error saving progress:', error);
      // You might want to show a user-friendly error message here
    } finally {
      setSavingProgress((prev) => ({ ...prev, [id]: false }));
    }
  };

  const toggleActionPopup = (index) => {
    setShowActionPopup(showActionPopup === index ? null : index);
  };

  const handleActionSelect = (action, deliverable) => {
    setSelectedDeliverable(deliverable);
    setSelectedModal(action);
    setShowActionPopup(null); // Close the popup itself
  };

  const handleModalClose = () => {
    setSelectedModal(null);
    // Keep selectedDeliverable for a moment if needed for animations, or clear it too
    // setSelectedDeliverable(null);
  };
  return (
    <div className="relative text-xs overflow-x-auto rounded-lg shadow-md min-h-[300px]"> {/* Reduced min-h for more compact display */}
      <table className="w-full text-xs text-left text-gray-500">
        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
          <tr>
            {columns.map((column) => (
              <th
                key={column.columnName}
                className="px-2 py-3 relative border-r border-gray-200"
                style={{ width: columnWidths[column.dbColumn] }}
              >
                <div className="flex items-center justify-between pr-2">
                  <span className="truncate">{column.columnName}</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-4 h-4 cursor-pointer"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    onClick={() => sortDataHandler(column.dbColumn)}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 4v8m0 0l4-4m-4 4l-4-4" />
                  </svg>
                </div>
                <div
                  className={`absolute right-0 top-0 h-full w-2 cursor-col-resize bg-transparent hover:bg-gray-300 ${
                    resizingColumn === column.dbColumn ? 'bg-blue-400 opacity-50' : ''
                  }`}
                  onMouseDown={(e) => handleResizeStart(e, column.dbColumn)}
                />
              </th>
            ))}
            <th className="px-6 py-3 w-24 text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {tableData.length === 0 ? (
            <tr>
              <td colSpan={columns.length + 1} className="text-center py-4 text-gray-500">
                No data available
              </td>
            </tr>
          ) : (
            tableData.map((item, index) => (
              <Fragment key={item.id}>
                <tr className="bg-white border-b hover:bg-gray-50">
                  {columns.map((column) => (
                    <td
                      key={`${index}-${column.dbColumn}`}
                      className="px-2 h-16 border-r border-gray-200 overflow-hidden"
                      style={{ width: columnWidths[column.dbColumn] }}
                    >                      {column.dbColumn === 'scope_percentage' ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="10"
                            value={progressUpdates[item.id] ?? (parseInt(item[column.dbColumn]) || 0)}
                            onChange={(e) => handleScopeChange(item.id, e.target.value)}
                            className="w-16 border border-gray-300 rounded-md p-1 text-xs"
                          />
                          <span>%</span>                          <button
                            onClick={() => handleSaveProgress(item.id)}
                            disabled={savingProgress[item.id] || progressUpdates[item.id] === undefined}
                            className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                            title="Save progress"
                          >
                            {savingProgress[item.id] ? 'Saving...' : 'Save'}
                          </button>
                          {item[column.dbColumn] === '100%' ? (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="text-green-500 w-4 h-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                          ) : (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="text-gray-500 w-4 h-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                          )}
                        </div>                      ) : column.dbColumn === 'payment_percentage' ? (
                        <div className="flex items-center space-x-1">
                          <span>{item[column.dbColumn]}</span>
                          {item[column.dbColumn] === '100%' ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="text-green-500 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="text-gray-500 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                        </div>                      ) : column.dbColumn === 'progress' ? (
                        <div className="flex items-center space-x-1">
                          {(() => {
                            // Get the current progress value - either from pending updates or from the current scope
                            const currentProgress = progressUpdates[item.id] !== undefined 
                              ? progressUpdates[item.id] 
                              : (item.scope_percentage ? parseInt(item.scope_percentage.toString().replace('%', '')) : 0);
                            
                            // Debug logging
                            console.log(`Progress for item ${item.id}:`, {
                              pendingUpdate: progressUpdates[item.id],
                              scope_percentage: item.scope_percentage,
                              progress: item.progress,
                              currentProgress
                            });
                            
                            return (
                              <>
                                <span>{currentProgress}%</span>
                                {currentProgress === 100 ? (
                                  <svg xmlns="http://www.w3.org/2000/svg" className="text-green-500 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                ) : (
                                  <svg xmlns="http://www.w3.org/2000/svg" className="text-gray-500 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                )}
                              </>
                            );
                          })()}
                        </div>) : column.dbColumn === 'start_date' || column.dbColumn === 'end_date' ? (
                        <span>{item[column.dbColumn].split('-').reverse().join('-')}</span>
                      ) : column.dbColumn === 'budget' || column.dbColumn === 'amount' || column.dbColumn === 'invoiced' || column.dbColumn === 'remaining_budget' ? (
                        <span className="px-2 py-2">{formatCurrency(item[column.dbColumn], 'SAR', false)}</span>
                      ) : (
                        <span className="px-2 py-2">{item[column.dbColumn]}</span>
                      )}
                    </td>
                  ))}
                  <td className="px-2 h-16 text-center relative">
                    <div className="flex items-center justify-center space-x-2">
                      <button onClick={() => handleEditClick(item)} className="text-blue-500 hover:text-blue-700">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button onClick={() => handleDeleteClick(item.id)} className="text-red-500 hover:text-red-700">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5-4h4a1 1 0 011 1v1H9V4a1 1 0 011-1z" />
                        </svg>
                      </button>
                      <button onClick={() => toggleAccordion(index)} className="text-gray-500 hover:text-gray-700">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className={`w-5 h-5 transition-transform ${openAccordion === index ? 'rotate-180' : ''}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <div className="relative">
                        <button type="button" onClick={() => toggleActionPopup(index)} className="text-gray-500 hover:text-gray-700 focus:outline-none">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                          </svg>
                        </button>
                        {showActionPopup === index && (
                          <ActionPopup
                            onClose={() => setShowActionPopup(null)}
                            onSelect={(action, deliverable) => handleActionSelect(action, item)}
                            deliverable={item}
                          />
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
                {openAccordion === index && (
                  <tr>
                    <td colSpan={columns.length + 1} className="p-0">
                      <div className="px-6 py-4 bg-gray-50">
                        <p>Details for {item.name}</p>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))
          )}
        </tbody>
      </table>

      {/* Modals are now rendered here, wrapped with ModalWrapper */}
      {selectedModal === 'completion' && selectedDeliverable && (
        <DeliveryCompletionModal
          onClose={handleModalClose}
          deliverable={selectedDeliverable}
          projectId={projectId}
          onSuccessfulSubmit={() => { /* Optionally refresh data */ handleModalClose(); }}
        />
      )}
      {selectedModal === 'invoice' && selectedDeliverable && (
        <DeliveryInvoiceModal
          onClose={handleModalClose}
          deliverable={selectedDeliverable}
          projectId={projectId}
          onSuccessfulSubmit={() => { /* Handle successful submit, e.g., refresh data */ handleModalClose(); }}
        />
      )}
      {selectedModal === 'details' && selectedDeliverable && (
        <DeliverableDetailsModal
          onClose={handleModalClose}
          deliverable={selectedDeliverable}
          projectId={projectId}
        />
      )}
      {selectedModal === 'changeRequest' && selectedDeliverable && (
        <ChangeRequestModal
          onClose={handleModalClose}
          deliverable={selectedDeliverable}
        />
      )}
      {selectedModal === 'dates' && selectedDeliverable && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-center items-center">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Change Deliverable Dates</h2>
              <button onClick={handleModalClose} className="text-gray-500 hover:text-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">New Start Date</label>
                <input type="date" className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">New End Date</label>
                <input type="date" className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
              </div>
              <button className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">Submit</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .resize-active {
          cursor: col-resize !important;
          user-select: none !important;
        }
        th, td {
          position: relative;
        }
        .cursor-col-resize {
          cursor: col-resize;
        }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button {
          opacity: 1;
        }
      `}</style>
    </div>
  );
};

export default ProjectDelivarablesTable;