-- Create momo_payments table
CREATE TABLE IF NOT EXISTS momo_payments (
    id SERIAL PRIMARY KEY,
    external_id VARCHAR(255) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'RWF',
    payer_number VARCHAR(20) NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'PENDING',
    financial_transaction_id VARCHAR(255),
    conversation_id VARCHAR(255),
    initiated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_momo_payments_external_id ON momo_payments(external_id);
CREATE INDEX IF NOT EXISTS idx_momo_payments_conversation_id ON momo_payments(conversation_id);
CREATE INDEX IF NOT EXISTS idx_momo_payments_payment_status ON momo_payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_momo_payments_user_id ON momo_payments(user_id);

-- Add comments for documentation
COMMENT ON TABLE momo_payments IS 'Stores MTN MoMo payment transactions';
COMMENT ON COLUMN momo_payments.external_id IS 'External reference ID from the client application';
COMMENT ON COLUMN momo_payments.amount IS 'Payment amount in the smallest currency unit (e.g., RWF)';
COMMENT ON COLUMN momo_payments.currency IS 'Currency code (e.g., RWF)';
COMMENT ON COLUMN momo_payments.payer_number IS 'Phone number of the payer';
COMMENT ON COLUMN momo_payments.payment_status IS 'Current status of the payment (PENDING, SUCCESSFUL, FAILED, etc.)';
COMMENT ON COLUMN momo_payments.financial_transaction_id IS 'Transaction ID from MTN MoMo';
COMMENT ON COLUMN momo_payments.conversation_id IS 'Reference ID used for tracking the payment';
COMMENT ON COLUMN momo_payments.initiated_at IS 'Timestamp when the payment was initiated';
COMMENT ON COLUMN momo_payments.updated_at IS 'Timestamp when the payment was last updated';
COMMENT ON COLUMN momo_payments.user_id IS 'Reference to the user who initiated the payment';

-- Create a function to update the updated_at column automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to update the updated_at column on each update
CREATE TRIGGER update_momo_payments_updated_at
BEFORE UPDATE ON momo_payments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
