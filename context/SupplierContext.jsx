import React, { createContext, useState } from "react";

export const SupplierContext = createContext();

export const SupplierProvider = ({ children }) => {
  const [suppliers, setSuppliers] = useState([]);

  const addSupplier = (supplier) => {
    setSuppliers([...suppliers, { ...supplier, id: Date.now().toString() }]);
  };

  const updateSupplier = (id, updatedSupplier) => {
    setSuppliers(
      suppliers.map((supplier) =>
        supplier.id === id ? { ...updatedSupplier, id } : supplier
      )
    );
  };

  const deleteSupplier = (id) => {
    setSuppliers(suppliers.filter((supplier) => supplier.id !== id));
  };

  return (
    <SupplierContext.Provider
      value={{ suppliers, addSupplier, updateSupplier, deleteSupplier }}
    >
      {children}
    </SupplierContext.Provider>
  );
};
