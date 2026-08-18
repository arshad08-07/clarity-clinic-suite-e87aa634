export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          appointment_type: string | null
          branch_id: string | null
          created_at: string
          created_by: string | null
          doctor_id: string | null
          duration_min: number
          id: string
          lead_id: string | null
          notes: string | null
          patient_id: string | null
          reason: string | null
          scheduled_at: string
          status: Database["public"]["Enums"]["appointment_status"]
          updated_at: string
        }
        Insert: {
          appointment_type?: string | null
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          doctor_id?: string | null
          duration_min?: number
          id?: string
          lead_id?: string | null
          notes?: string | null
          patient_id?: string | null
          reason?: string | null
          scheduled_at: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Update: {
          appointment_type?: string | null
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          doctor_id?: string | null
          duration_min?: number
          id?: string
          lead_id?: string | null
          notes?: string | null
          patient_id?: string | null
          reason?: string | null
          scheduled_at?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json
          entity: string
          entity_id: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json
          entity: string
          entity_id?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json
          entity?: string
          entity_id?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      branches: {
        Row: {
          address: string | null
          city: string | null
          code: string
          country: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          phone: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          code: string
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          code?: string
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      claim_status_history: {
        Row: {
          changed_by: string | null
          claim_id: string
          created_at: string
          id: string
          note: string | null
          status: string
        }
        Insert: {
          changed_by?: string | null
          claim_id: string
          created_at?: string
          id?: string
          note?: string | null
          status: string
        }
        Update: {
          changed_by?: string | null
          claim_id?: string
          created_at?: string
          id?: string
          note?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "claim_status_history_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "insurance_claims"
            referencedColumns: ["id"]
          },
        ]
      }
      communications: {
        Row: {
          attempts: number
          branch_id: string | null
          channel: string
          created_at: string
          created_by: string | null
          direction: string
          failure_reason: string | null
          follow_up_id: string | null
          id: string
          lead_id: string | null
          message: string | null
          patient_id: string | null
          provider: string | null
          purpose: string | null
          recipient: string | null
          scheduled_at: string | null
          sent_at: string | null
          status: string
          subject: string | null
        }
        Insert: {
          attempts?: number
          branch_id?: string | null
          channel?: string
          created_at?: string
          created_by?: string | null
          direction?: string
          failure_reason?: string | null
          follow_up_id?: string | null
          id?: string
          lead_id?: string | null
          message?: string | null
          patient_id?: string | null
          provider?: string | null
          purpose?: string | null
          recipient?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
        }
        Update: {
          attempts?: number
          branch_id?: string | null
          channel?: string
          created_at?: string
          created_by?: string | null
          direction?: string
          failure_reason?: string | null
          follow_up_id?: string | null
          id?: string
          lead_id?: string | null
          message?: string | null
          patient_id?: string | null
          provider?: string | null
          purpose?: string | null
          recipient?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communications_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_follow_up_id_fkey"
            columns: ["follow_up_id"]
            isOneToOne: false
            referencedRelation: "follow_ups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnosis_catalog: {
        Row: {
          category: string | null
          code: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          category?: string | null
          code: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          category?: string | null
          code?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      diagnostic_orders: {
        Row: {
          created_at: string
          doctor_notes: string | null
          eye: Database["public"]["Enums"]["eye_side"] | null
          findings: string | null
          id: string
          impression: string | null
          ordered_by: string | null
          patient_id: string
          performed_at: string | null
          performed_by: string | null
          priority: string
          report_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["order_status"]
          test_id: string | null
          updated_at: string
          visit_id: string | null
        }
        Insert: {
          created_at?: string
          doctor_notes?: string | null
          eye?: Database["public"]["Enums"]["eye_side"] | null
          findings?: string | null
          id?: string
          impression?: string | null
          ordered_by?: string | null
          patient_id: string
          performed_at?: string | null
          performed_by?: string | null
          priority?: string
          report_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          test_id?: string | null
          updated_at?: string
          visit_id?: string | null
        }
        Update: {
          created_at?: string
          doctor_notes?: string | null
          eye?: Database["public"]["Enums"]["eye_side"] | null
          findings?: string | null
          id?: string
          impression?: string | null
          ordered_by?: string | null
          patient_id?: string
          performed_at?: string | null
          performed_by?: string | null
          priority?: string
          report_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          test_id?: string | null
          updated_at?: string
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "diagnostic_orders_ordered_by_fkey"
            columns: ["ordered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnostic_orders_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnostic_orders_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnostic_orders_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnostic_orders_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnostic_orders_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnostic_tests: {
        Row: {
          category: string | null
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          price: number
        }
        Insert: {
          category?: string | null
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          price?: number
        }
        Update: {
          category?: string | null
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          price?: number
        }
        Relationships: []
      }
      equipment: {
        Row: {
          branch_id: string | null
          created_at: string
          id: string
          last_service_date: string | null
          manufacturer: string | null
          name: string
          next_service_date: string | null
          notes: string | null
          purchase_date: string | null
          serial_no: string | null
          status: string
          updated_at: string
          warranty_until: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          id?: string
          last_service_date?: string | null
          manufacturer?: string | null
          name: string
          next_service_date?: string | null
          notes?: string | null
          purchase_date?: string | null
          serial_no?: string | null
          status?: string
          updated_at?: string
          warranty_until?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          id?: string
          last_service_date?: string | null
          manufacturer?: string | null
          name?: string
          next_service_date?: string | null
          notes?: string | null
          purchase_date?: string | null
          serial_no?: string | null
          status?: string
          updated_at?: string
          warranty_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      examinations: {
        Row: {
          advice: string | null
          anterior_chamber_od: string | null
          anterior_chamber_os: string | null
          cataract_grade_od: string | null
          cataract_grade_os: string | null
          chief_complaint: string | null
          conjunctiva_od: string | null
          conjunctiva_os: string | null
          cornea_od: string | null
          cornea_os: string | null
          created_at: string
          doctor_id: string | null
          fundus_od: string | null
          fundus_os: string | null
          history: string | null
          id: string
          iris_od: string | null
          iris_os: string | null
          lacrimal_od: string | null
          lacrimal_os: string | null
          lashes_od: string | null
          lashes_os: string | null
          lens_od: string | null
          lens_os: string | null
          lids_od: string | null
          lids_os: string | null
          macula_od: string | null
          macula_os: string | null
          optic_disc_od: string | null
          optic_disc_os: string | null
          patient_id: string
          plan: string | null
          pupil_od: string | null
          pupil_os: string | null
          retina_od: string | null
          retina_os: string | null
          sclera_od: string | null
          sclera_os: string | null
          updated_at: string
          vessels_od: string | null
          vessels_os: string | null
          visit_id: string | null
          vitreous_od: string | null
          vitreous_os: string | null
        }
        Insert: {
          advice?: string | null
          anterior_chamber_od?: string | null
          anterior_chamber_os?: string | null
          cataract_grade_od?: string | null
          cataract_grade_os?: string | null
          chief_complaint?: string | null
          conjunctiva_od?: string | null
          conjunctiva_os?: string | null
          cornea_od?: string | null
          cornea_os?: string | null
          created_at?: string
          doctor_id?: string | null
          fundus_od?: string | null
          fundus_os?: string | null
          history?: string | null
          id?: string
          iris_od?: string | null
          iris_os?: string | null
          lacrimal_od?: string | null
          lacrimal_os?: string | null
          lashes_od?: string | null
          lashes_os?: string | null
          lens_od?: string | null
          lens_os?: string | null
          lids_od?: string | null
          lids_os?: string | null
          macula_od?: string | null
          macula_os?: string | null
          optic_disc_od?: string | null
          optic_disc_os?: string | null
          patient_id: string
          plan?: string | null
          pupil_od?: string | null
          pupil_os?: string | null
          retina_od?: string | null
          retina_os?: string | null
          sclera_od?: string | null
          sclera_os?: string | null
          updated_at?: string
          vessels_od?: string | null
          vessels_os?: string | null
          visit_id?: string | null
          vitreous_od?: string | null
          vitreous_os?: string | null
        }
        Update: {
          advice?: string | null
          anterior_chamber_od?: string | null
          anterior_chamber_os?: string | null
          cataract_grade_od?: string | null
          cataract_grade_os?: string | null
          chief_complaint?: string | null
          conjunctiva_od?: string | null
          conjunctiva_os?: string | null
          cornea_od?: string | null
          cornea_os?: string | null
          created_at?: string
          doctor_id?: string | null
          fundus_od?: string | null
          fundus_os?: string | null
          history?: string | null
          id?: string
          iris_od?: string | null
          iris_os?: string | null
          lacrimal_od?: string | null
          lacrimal_os?: string | null
          lashes_od?: string | null
          lashes_os?: string | null
          lens_od?: string | null
          lens_os?: string | null
          lids_od?: string | null
          lids_os?: string | null
          macula_od?: string | null
          macula_os?: string | null
          optic_disc_od?: string | null
          optic_disc_os?: string | null
          patient_id?: string
          plan?: string | null
          pupil_od?: string | null
          pupil_os?: string | null
          retina_od?: string | null
          retina_os?: string | null
          sclera_od?: string | null
          sclera_os?: string | null
          updated_at?: string
          vessels_od?: string | null
          vessels_os?: string | null
          visit_id?: string | null
          vitreous_od?: string | null
          vitreous_os?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "examinations_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "examinations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "examinations_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          branch_id: string | null
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          expense_date: string
          id: string
          paid_to: string | null
          payment_method: string | null
        }
        Insert: {
          amount: number
          branch_id?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          paid_to?: string | null
          payment_method?: string | null
        }
        Update: {
          amount?: number
          branch_id?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          paid_to?: string | null
          payment_method?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_ups: {
        Row: {
          allow_duplicate: boolean
          assigned_to: string | null
          branch_id: string | null
          cancel_reason: string | null
          completed_at: string | null
          completed_visit_id: string | null
          created_at: string
          created_by: string | null
          doctor_id: string | null
          due_date: string
          id: string
          is_done: boolean
          notes: string | null
          outcome_notes: string | null
          patient_id: string
          priority: string
          reason: string | null
          reminder_offset_days: number
          status: string
          surgery_id: string | null
          type: string | null
          updated_at: string
          visit_id: string | null
        }
        Insert: {
          allow_duplicate?: boolean
          assigned_to?: string | null
          branch_id?: string | null
          cancel_reason?: string | null
          completed_at?: string | null
          completed_visit_id?: string | null
          created_at?: string
          created_by?: string | null
          doctor_id?: string | null
          due_date: string
          id?: string
          is_done?: boolean
          notes?: string | null
          outcome_notes?: string | null
          patient_id: string
          priority?: string
          reason?: string | null
          reminder_offset_days?: number
          status?: string
          surgery_id?: string | null
          type?: string | null
          updated_at?: string
          visit_id?: string | null
        }
        Update: {
          allow_duplicate?: boolean
          assigned_to?: string | null
          branch_id?: string | null
          cancel_reason?: string | null
          completed_at?: string | null
          completed_visit_id?: string | null
          created_at?: string
          created_by?: string | null
          doctor_id?: string | null
          due_date?: string
          id?: string
          is_done?: boolean
          notes?: string | null
          outcome_notes?: string | null
          patient_id?: string
          priority?: string
          reason?: string | null
          reminder_offset_days?: number
          status?: string
          surgery_id?: string | null
          type?: string | null
          updated_at?: string
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "follow_ups_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_completed_visit_id_fkey"
            columns: ["completed_visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_surgery_id_fkey"
            columns: ["surgery_id"]
            isOneToOne: false
            referencedRelation: "surgeries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      goods_receipt_items: {
        Row: {
          accepted_qty: number
          batch_id: string | null
          batch_no: string | null
          created_at: string
          expiry_date: string | null
          goods_receipt_id: string
          id: string
          notes: string | null
          product_id: string
          purchase_order_item_id: string | null
          received_qty: number
          rejected_qty: number
          selling_price: number | null
          tax_percent: number
          unit_cost: number
        }
        Insert: {
          accepted_qty?: number
          batch_id?: string | null
          batch_no?: string | null
          created_at?: string
          expiry_date?: string | null
          goods_receipt_id: string
          id?: string
          notes?: string | null
          product_id: string
          purchase_order_item_id?: string | null
          received_qty?: number
          rejected_qty?: number
          selling_price?: number | null
          tax_percent?: number
          unit_cost?: number
        }
        Update: {
          accepted_qty?: number
          batch_id?: string | null
          batch_no?: string | null
          created_at?: string
          expiry_date?: string | null
          goods_receipt_id?: string
          id?: string
          notes?: string | null
          product_id?: string
          purchase_order_item_id?: string | null
          received_qty?: number
          rejected_qty?: number
          selling_price?: number | null
          tax_percent?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "goods_receipt_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "product_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipt_items_goods_receipt_id_fkey"
            columns: ["goods_receipt_id"]
            isOneToOne: false
            referencedRelation: "goods_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipt_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipt_items_purchase_order_item_id_fkey"
            columns: ["purchase_order_item_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      goods_receipts: {
        Row: {
          allow_over_receipt: boolean
          branch_id: string | null
          created_at: string
          grn_no: string
          id: string
          invoice_ref: string | null
          notes: string | null
          purchase_order_id: string
          received_at: string
          received_by: string | null
          supplier_id: string | null
        }
        Insert: {
          allow_over_receipt?: boolean
          branch_id?: string | null
          created_at?: string
          grn_no?: string
          id?: string
          invoice_ref?: string | null
          notes?: string | null
          purchase_order_id: string
          received_at?: string
          received_by?: string | null
          supplier_id?: string | null
        }
        Update: {
          allow_over_receipt?: boolean
          branch_id?: string | null
          created_at?: string
          grn_no?: string
          id?: string
          invoice_ref?: string | null
          notes?: string | null
          purchase_order_id?: string
          received_at?: string
          received_by?: string | null
          supplier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goods_receipts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipts_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipts_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_claims: {
        Row: {
          approved_amount: number | null
          claim_amount: number
          claim_no: string | null
          created_at: string
          id: string
          invoice_id: string | null
          notes: string | null
          patient_id: string
          policy_no: string | null
          provider: string
          status: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          approved_amount?: number | null
          claim_amount?: number
          claim_no?: string | null
          created_at?: string
          id?: string
          invoice_id?: string | null
          notes?: string | null
          patient_id: string
          policy_no?: string | null
          provider: string
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          approved_amount?: number | null
          claim_amount?: number
          claim_no?: string | null
          created_at?: string
          id?: string
          invoice_id?: string | null
          notes?: string | null
          patient_id?: string
          policy_no?: string | null
          provider?: string
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "insurance_claims_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_claims_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          amount: number
          batch_id: string | null
          created_at: string
          description: string
          id: string
          invoice_id: string
          item_type: string
          product_id: string | null
          quantity: number
          source_id: string | null
          source_ref: string | null
          source_type: string | null
          tax_percent: number
          unit_price: number
        }
        Insert: {
          amount?: number
          batch_id?: string | null
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          item_type?: string
          product_id?: string | null
          quantity?: number
          source_id?: string | null
          source_ref?: string | null
          source_type?: string | null
          tax_percent?: number
          unit_price?: number
        }
        Update: {
          amount?: number
          batch_id?: string | null
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          item_type?: string
          product_id?: string | null
          quantity?: number
          source_id?: string | null
          source_ref?: string | null
          source_type?: string | null
          tax_percent?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "product_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          branch_id: string | null
          created_at: string
          created_by: string | null
          discount: number
          id: string
          invoice_no: string
          invoice_type: string
          notes: string | null
          paid_amount: number
          patient_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
          subtotal: number
          tax: number
          total: number
          updated_at: string
          visit_id: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          discount?: number
          id?: string
          invoice_no: string
          invoice_type?: string
          notes?: string | null
          paid_amount?: number
          patient_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
          visit_id?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          discount?: number
          id?: string
          invoice_no?: string
          invoice_type?: string
          notes?: string | null
          paid_amount?: number
          patient_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      iol_inventory: {
        Row: {
          branch_id: string | null
          created_at: string
          expiry_date: string | null
          id: string
          iol_model_id: string
          is_used: boolean
          power: number | null
          serial_no: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          iol_model_id: string
          is_used?: boolean
          power?: number | null
          serial_no: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          iol_model_id?: string
          is_used?: boolean
          power?: number | null
          serial_no?: string
        }
        Relationships: [
          {
            foreignKeyName: "iol_inventory_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "iol_inventory_iol_model_id_fkey"
            columns: ["iol_model_id"]
            isOneToOne: false
            referencedRelation: "iol_models"
            referencedColumns: ["id"]
          },
        ]
      }
      iol_models: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          manufacturer: string | null
          model_code: string | null
          name: string
          price: number | null
          product_id: string | null
          type: string | null
          unit_cost: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          manufacturer?: string | null
          model_code?: string | null
          name: string
          price?: number | null
          product_id?: string | null
          type?: string | null
          unit_cost?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          manufacturer?: string | null
          model_code?: string | null
          name?: string
          price?: number | null
          product_id?: string | null
          type?: string | null
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "iol_models_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_activities: {
        Row: {
          activity: string
          created_at: string
          created_by: string | null
          id: string
          lead_id: string
          next_action_at: string | null
          outcome: string | null
        }
        Insert: {
          activity: string
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id: string
          next_action_at?: string | null
          outcome?: string | null
        }
        Update: {
          activity?: string
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id?: string
          next_action_at?: string | null
          outcome?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_to: string | null
          branch_id: string | null
          campaign: string | null
          converted_patient_id: string | null
          created_at: string
          email: string | null
          id: string
          interest: string | null
          name: string
          notes: string | null
          phone: string
          source: string | null
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          branch_id?: string | null
          campaign?: string | null
          converted_patient_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          interest?: string | null
          name: string
          notes?: string | null
          phone: string
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          branch_id?: string | null
          campaign?: string | null
          converted_patient_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          interest?: string | null
          name?: string
          notes?: string | null
          phone?: string
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_converted_patient_id_fkey"
            columns: ["converted_patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      optical_orders: {
        Row: {
          branch_id: string | null
          brand: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          coating: string | null
          cost_price: number
          created_at: string
          created_by: string | null
          delivered_at: string | null
          delivery_date: string | null
          discount: number
          frame_price: number
          frame_product_id: string | null
          id: string
          invoice_id: string | null
          lens_index: string | null
          lens_od_price: number
          lens_od_product_id: string | null
          lens_os_price: number
          lens_os_product_id: string | null
          lens_product_id: string | null
          notes: string | null
          optical_prescription_id: string | null
          patient_id: string
          quantity: number
          selling_price: number
          status: string
          stock_applied: boolean
          tax_percent: number
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          brand?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          coating?: string | null
          cost_price?: number
          created_at?: string
          created_by?: string | null
          delivered_at?: string | null
          delivery_date?: string | null
          discount?: number
          frame_price?: number
          frame_product_id?: string | null
          id?: string
          invoice_id?: string | null
          lens_index?: string | null
          lens_od_price?: number
          lens_od_product_id?: string | null
          lens_os_price?: number
          lens_os_product_id?: string | null
          lens_product_id?: string | null
          notes?: string | null
          optical_prescription_id?: string | null
          patient_id: string
          quantity?: number
          selling_price?: number
          status?: string
          stock_applied?: boolean
          tax_percent?: number
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          brand?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          coating?: string | null
          cost_price?: number
          created_at?: string
          created_by?: string | null
          delivered_at?: string | null
          delivery_date?: string | null
          discount?: number
          frame_price?: number
          frame_product_id?: string | null
          id?: string
          invoice_id?: string | null
          lens_index?: string | null
          lens_od_price?: number
          lens_od_product_id?: string | null
          lens_os_price?: number
          lens_os_product_id?: string | null
          lens_product_id?: string | null
          notes?: string | null
          optical_prescription_id?: string | null
          patient_id?: string
          quantity?: number
          selling_price?: number
          status?: string
          stock_applied?: boolean
          tax_percent?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "optical_orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "optical_orders_frame_product_id_fkey"
            columns: ["frame_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "optical_orders_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "optical_orders_lens_od_product_id_fkey"
            columns: ["lens_od_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "optical_orders_lens_os_product_id_fkey"
            columns: ["lens_os_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "optical_orders_lens_product_id_fkey"
            columns: ["lens_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "optical_orders_optical_prescription_id_fkey"
            columns: ["optical_prescription_id"]
            isOneToOne: false
            referencedRelation: "optical_prescriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "optical_orders_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      optical_prescriptions: {
        Row: {
          add_od: number | null
          add_os: number | null
          axis_od: number | null
          axis_os: number | null
          base_curve: number | null
          coating: string | null
          created_at: string
          cyl_od: number | null
          cyl_os: number | null
          diameter: number | null
          id: string
          lens_type: string | null
          patient_id: string
          pd: number | null
          prescribed_by: string | null
          prism_od: string | null
          prism_os: string | null
          remarks: string | null
          sph_od: number | null
          sph_os: number | null
          type: string
          updated_at: string
          valid_until: string | null
          visit_id: string | null
        }
        Insert: {
          add_od?: number | null
          add_os?: number | null
          axis_od?: number | null
          axis_os?: number | null
          base_curve?: number | null
          coating?: string | null
          created_at?: string
          cyl_od?: number | null
          cyl_os?: number | null
          diameter?: number | null
          id?: string
          lens_type?: string | null
          patient_id: string
          pd?: number | null
          prescribed_by?: string | null
          prism_od?: string | null
          prism_os?: string | null
          remarks?: string | null
          sph_od?: number | null
          sph_os?: number | null
          type?: string
          updated_at?: string
          valid_until?: string | null
          visit_id?: string | null
        }
        Update: {
          add_od?: number | null
          add_os?: number | null
          axis_od?: number | null
          axis_os?: number | null
          base_curve?: number | null
          coating?: string | null
          created_at?: string
          cyl_od?: number | null
          cyl_os?: number | null
          diameter?: number | null
          id?: string
          lens_type?: string | null
          patient_id?: string
          pd?: number | null
          prescribed_by?: string | null
          prism_od?: string | null
          prism_os?: string | null
          remarks?: string | null
          sph_od?: number | null
          sph_os?: number | null
          type?: string
          updated_at?: string
          valid_until?: string | null
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "optical_prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "optical_prescriptions_prescribed_by_fkey"
            columns: ["prescribed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "optical_prescriptions_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      optometry_records: {
        Row: {
          add_od: number | null
          add_os: number | null
          aided_va_od: string | null
          aided_va_os: string | null
          auto_ref_od: string | null
          auto_ref_os: string | null
          axis_od: number | null
          axis_os: number | null
          bcva_od: string | null
          bcva_os: string | null
          color_vision: string | null
          contrast_sensitivity: string | null
          created_at: string
          cyl_od: number | null
          cyl_os: number | null
          id: string
          iop_method: string | null
          iop_od: number | null
          iop_os: number | null
          keratometry: string | null
          near_va_od: string | null
          near_va_os: string | null
          notes: string | null
          optometrist_id: string | null
          pachymetry_od: number | null
          pachymetry_os: number | null
          patient_id: string
          pd: number | null
          prism_od: string | null
          prism_os: string | null
          sph_od: number | null
          sph_os: number | null
          ucva_od: string | null
          ucva_os: string | null
          updated_at: string
          visit_id: string | null
          visual_field: string | null
        }
        Insert: {
          add_od?: number | null
          add_os?: number | null
          aided_va_od?: string | null
          aided_va_os?: string | null
          auto_ref_od?: string | null
          auto_ref_os?: string | null
          axis_od?: number | null
          axis_os?: number | null
          bcva_od?: string | null
          bcva_os?: string | null
          color_vision?: string | null
          contrast_sensitivity?: string | null
          created_at?: string
          cyl_od?: number | null
          cyl_os?: number | null
          id?: string
          iop_method?: string | null
          iop_od?: number | null
          iop_os?: number | null
          keratometry?: string | null
          near_va_od?: string | null
          near_va_os?: string | null
          notes?: string | null
          optometrist_id?: string | null
          pachymetry_od?: number | null
          pachymetry_os?: number | null
          patient_id: string
          pd?: number | null
          prism_od?: string | null
          prism_os?: string | null
          sph_od?: number | null
          sph_os?: number | null
          ucva_od?: string | null
          ucva_os?: string | null
          updated_at?: string
          visit_id?: string | null
          visual_field?: string | null
        }
        Update: {
          add_od?: number | null
          add_os?: number | null
          aided_va_od?: string | null
          aided_va_os?: string | null
          auto_ref_od?: string | null
          auto_ref_os?: string | null
          axis_od?: number | null
          axis_os?: number | null
          bcva_od?: string | null
          bcva_os?: string | null
          color_vision?: string | null
          contrast_sensitivity?: string | null
          created_at?: string
          cyl_od?: number | null
          cyl_os?: number | null
          id?: string
          iop_method?: string | null
          iop_od?: number | null
          iop_os?: number | null
          keratometry?: string | null
          near_va_od?: string | null
          near_va_os?: string | null
          notes?: string | null
          optometrist_id?: string | null
          pachymetry_od?: number | null
          pachymetry_os?: number | null
          patient_id?: string
          pd?: number | null
          prism_od?: string | null
          prism_os?: string | null
          sph_od?: number | null
          sph_os?: number | null
          ucva_od?: string | null
          ucva_os?: string | null
          updated_at?: string
          visit_id?: string | null
          visual_field?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "optometry_records_optometrist_id_fkey"
            columns: ["optometrist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "optometry_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "optometry_records_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      ot_rooms: {
        Row: {
          branch_id: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "ot_rooms_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_diagnoses: {
        Row: {
          created_at: string
          diagnosed_by: string | null
          diagnosis_id: string | null
          diagnosis_text: string | null
          eye: Database["public"]["Enums"]["eye_side"] | null
          id: string
          is_primary: boolean
          notes: string | null
          patient_id: string
          severity: string | null
          visit_id: string | null
        }
        Insert: {
          created_at?: string
          diagnosed_by?: string | null
          diagnosis_id?: string | null
          diagnosis_text?: string | null
          eye?: Database["public"]["Enums"]["eye_side"] | null
          id?: string
          is_primary?: boolean
          notes?: string | null
          patient_id: string
          severity?: string | null
          visit_id?: string | null
        }
        Update: {
          created_at?: string
          diagnosed_by?: string | null
          diagnosis_id?: string | null
          diagnosis_text?: string | null
          eye?: Database["public"]["Enums"]["eye_side"] | null
          id?: string
          is_primary?: boolean
          notes?: string | null
          patient_id?: string
          severity?: string | null
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_diagnoses_diagnosed_by_fkey"
            columns: ["diagnosed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_diagnoses_diagnosis_id_fkey"
            columns: ["diagnosis_id"]
            isOneToOne: false
            referencedRelation: "diagnosis_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_diagnoses_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_diagnoses_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_documents: {
        Row: {
          created_at: string
          created_by: string | null
          doc_type: string
          file_url: string | null
          id: string
          notes: string | null
          patient_id: string
          surgery_id: string | null
          title: string
          visit_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          doc_type: string
          file_url?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          surgery_id?: string | null
          title: string
          visit_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          doc_type?: string
          file_url?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          surgery_id?: string | null
          title?: string
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_documents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_documents_surgery_id_fkey"
            columns: ["surgery_id"]
            isOneToOne: false
            referencedRelation: "surgeries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_documents_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string | null
          allergies: string | null
          blood_group: string | null
          branch_id: string | null
          city: string | null
          converted_at: string | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          first_name: string
          gender: Database["public"]["Enums"]["gender_t"] | null
          id: string
          insurance_policy_no: string | null
          insurance_provider: string | null
          is_active: boolean
          last_name: string | null
          lead_campaign: string | null
          lead_id: string | null
          lead_source: string | null
          medical_history: string | null
          mrn: string
          phone: string
          pincode: string | null
          referred_by: string | null
          state: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          allergies?: string | null
          blood_group?: string | null
          branch_id?: string | null
          city?: string | null
          converted_at?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name: string
          gender?: Database["public"]["Enums"]["gender_t"] | null
          id?: string
          insurance_policy_no?: string | null
          insurance_provider?: string | null
          is_active?: boolean
          last_name?: string | null
          lead_campaign?: string | null
          lead_id?: string | null
          lead_source?: string | null
          medical_history?: string | null
          mrn: string
          phone: string
          pincode?: string | null
          referred_by?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          allergies?: string | null
          blood_group?: string | null
          branch_id?: string | null
          city?: string | null
          converted_at?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name?: string
          gender?: Database["public"]["Enums"]["gender_t"] | null
          id?: string
          insurance_policy_no?: string | null
          insurance_provider?: string | null
          is_active?: boolean
          last_name?: string | null
          lead_campaign?: string | null
          lead_id?: string | null
          lead_source?: string | null
          medical_history?: string | null
          mrn?: string
          phone?: string
          pincode?: string | null
          referred_by?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patients_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patients_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string
          method: string
          paid_at: string
          received_by: string | null
          reference: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          invoice_id: string
          method?: string
          paid_at?: string
          received_by?: string | null
          reference?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string
          method?: string
          paid_at?: string
          received_by?: string | null
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_sales: {
        Row: {
          amount: number
          batch_id: string | null
          branch_id: string | null
          created_at: string
          dispensed_by: string | null
          id: string
          invoice_id: string | null
          invoice_item_id: string | null
          notes: string | null
          patient_id: string
          prescription_id: string | null
          prescription_item_id: string | null
          product_id: string
          quantity: number
          returned_qty: number
          status: string
          tax_percent: number
          unit_price: number
          updated_at: string
          visit_id: string | null
        }
        Insert: {
          amount?: number
          batch_id?: string | null
          branch_id?: string | null
          created_at?: string
          dispensed_by?: string | null
          id?: string
          invoice_id?: string | null
          invoice_item_id?: string | null
          notes?: string | null
          patient_id: string
          prescription_id?: string | null
          prescription_item_id?: string | null
          product_id: string
          quantity?: number
          returned_qty?: number
          status?: string
          tax_percent?: number
          unit_price?: number
          updated_at?: string
          visit_id?: string | null
        }
        Update: {
          amount?: number
          batch_id?: string | null
          branch_id?: string | null
          created_at?: string
          dispensed_by?: string | null
          id?: string
          invoice_id?: string | null
          invoice_item_id?: string | null
          notes?: string | null
          patient_id?: string
          prescription_id?: string | null
          prescription_item_id?: string | null
          product_id?: string
          quantity?: number
          returned_qty?: number
          status?: string
          tax_percent?: number
          unit_price?: number
          updated_at?: string
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_sales_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "product_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_sales_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_sales_dispensed_by_fkey"
            columns: ["dispensed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_sales_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_sales_invoice_item_id_fkey"
            columns: ["invoice_item_id"]
            isOneToOne: false
            referencedRelation: "invoice_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_sales_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_sales_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_sales_prescription_item_id_fkey"
            columns: ["prescription_item_id"]
            isOneToOne: false
            referencedRelation: "prescription_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_sales_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_sales_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      prescription_items: {
        Row: {
          created_at: string
          dosage: string | null
          drug_name: string
          duration: string | null
          eye: Database["public"]["Enums"]["eye_side"] | null
          frequency: string | null
          id: string
          instructions: string | null
          prescription_id: string
          route: string | null
          strength: string | null
        }
        Insert: {
          created_at?: string
          dosage?: string | null
          drug_name: string
          duration?: string | null
          eye?: Database["public"]["Enums"]["eye_side"] | null
          frequency?: string | null
          id?: string
          instructions?: string | null
          prescription_id: string
          route?: string | null
          strength?: string | null
        }
        Update: {
          created_at?: string
          dosage?: string | null
          drug_name?: string
          duration?: string | null
          eye?: Database["public"]["Enums"]["eye_side"] | null
          frequency?: string | null
          id?: string
          instructions?: string | null
          prescription_id?: string
          route?: string | null
          strength?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prescription_items_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      prescriptions: {
        Row: {
          created_at: string
          doctor_id: string | null
          follow_up_date: string | null
          id: string
          notes: string | null
          patient_id: string
          updated_at: string
          visit_id: string | null
        }
        Insert: {
          created_at?: string
          doctor_id?: string | null
          follow_up_date?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          updated_at?: string
          visit_id?: string | null
        }
        Update: {
          created_at?: string
          doctor_id?: string | null
          follow_up_date?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          updated_at?: string
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      product_batches: {
        Row: {
          batch_no: string
          branch_id: string | null
          cost_price: number
          created_at: string
          expiry_date: string | null
          id: string
          product_id: string
          quantity: number
          selling_price: number
        }
        Insert: {
          batch_no: string
          branch_id?: string | null
          cost_price?: number
          created_at?: string
          expiry_date?: string | null
          id?: string
          product_id: string
          quantity?: number
          selling_price?: number
        }
        Update: {
          batch_no?: string
          branch_id?: string | null
          cost_price?: number
          created_at?: string
          expiry_date?: string | null
          id?: string
          product_id?: string
          quantity?: number
          selling_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_batches_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_batches_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand: string | null
          category: Database["public"]["Enums"]["product_category"]
          cost_price: number
          created_at: string
          hsn_code: string | null
          id: string
          is_active: boolean
          metadata: Json
          name: string
          reorder_level: number
          selling_price: number
          sku: string
          stock_qty: number
          tax_percent: number
          unit: string | null
          updated_at: string
        }
        Insert: {
          brand?: string | null
          category?: Database["public"]["Enums"]["product_category"]
          cost_price?: number
          created_at?: string
          hsn_code?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json
          name: string
          reorder_level?: number
          selling_price?: number
          sku: string
          stock_qty?: number
          tax_percent?: number
          unit?: string | null
          updated_at?: string
        }
        Update: {
          brand?: string | null
          category?: Database["public"]["Enums"]["product_category"]
          cost_price?: number
          created_at?: string
          hsn_code?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json
          name?: string
          reorder_level?: number
          selling_price?: number
          sku?: string
          stock_qty?: number
          tax_percent?: number
          unit?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          branch_id: string | null
          created_at: string
          designation: string | null
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          registration_no: string | null
          specialization: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          branch_id?: string | null
          created_at?: string
          designation?: string | null
          email?: string | null
          full_name?: string
          id: string
          is_active?: boolean
          phone?: string | null
          registration_no?: string | null
          specialization?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          branch_id?: string | null
          created_at?: string
          designation?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          registration_no?: string | null
          specialization?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_items: {
        Row: {
          amount: number
          created_at: string
          discount: number
          id: string
          product_id: string | null
          purchase_order_id: string
          quantity: number
          received_qty: number
          tax_percent: number
          unit_cost: number
        }
        Insert: {
          amount?: number
          created_at?: string
          discount?: number
          id?: string
          product_id?: string | null
          purchase_order_id: string
          quantity?: number
          received_qty?: number
          tax_percent?: number
          unit_cost?: number
        }
        Update: {
          amount?: number
          created_at?: string
          discount?: number
          id?: string
          product_id?: string | null
          purchase_order_id?: string
          quantity?: number
          received_qty?: number
          tax_percent?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          branch_id: string | null
          created_at: string
          created_by: string | null
          expected_date: string | null
          id: string
          notes: string | null
          order_date: string
          po_number: string
          status: Database["public"]["Enums"]["po_status"]
          supplier_id: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          expected_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          po_number: string
          status?: Database["public"]["Enums"]["po_status"]
          supplier_id?: string | null
          total_amount?: number
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          expected_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          po_number?: string
          status?: Database["public"]["Enums"]["po_status"]
          supplier_id?: string | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          branch_id: string | null
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          branch_id?: string | null
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          branch_id?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "settings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          batch_no: string | null
          branch_id: string | null
          change_qty: number
          created_at: string
          created_by: string | null
          expiry_date: string | null
          id: string
          product_id: string
          reason: string
          reference_id: string | null
        }
        Insert: {
          batch_no?: string | null
          branch_id?: string | null
          change_qty: number
          created_at?: string
          created_by?: string | null
          expiry_date?: string | null
          id?: string
          product_id: string
          reason?: string
          reference_id?: string | null
        }
        Update: {
          batch_no?: string | null
          branch_id?: string | null
          change_qty?: number
          created_at?: string
          created_by?: string | null
          expiry_date?: string | null
          id?: string
          product_id?: string
          reason?: string
          reference_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_transactions: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          goods_receipt_id: string | null
          id: string
          method: string | null
          notes: string | null
          purchase_order_id: string | null
          reference: string | null
          supplier_id: string
          txn_date: string
          txn_type: string
        }
        Insert: {
          amount?: number
          created_at?: string
          created_by?: string | null
          goods_receipt_id?: string | null
          id?: string
          method?: string | null
          notes?: string | null
          purchase_order_id?: string | null
          reference?: string | null
          supplier_id: string
          txn_date?: string
          txn_type?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          goods_receipt_id?: string | null
          id?: string
          method?: string | null
          notes?: string | null
          purchase_order_id?: string | null
          reference?: string | null
          supplier_id?: string
          txn_date?: string
          txn_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_transactions_goods_receipt_id_fkey"
            columns: ["goods_receipt_id"]
            isOneToOne: false
            referencedRelation: "goods_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_transactions_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_transactions_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          contact_person: string | null
          created_at: string
          email: string | null
          gst_no: string | null
          id: string
          is_active: boolean
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          gst_no?: string | null
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          gst_no?: string | null
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      surgeries: {
        Row: {
          anesthesia: string | null
          assistant_id: string | null
          biometry_axial_length: number | null
          biometry_k1: number | null
          biometry_k2: number | null
          biometry_order_id: string | null
          branch_id: string | null
          complications: string | null
          consent_document_id: string | null
          consent_signed: boolean
          consent_signed_at: string | null
          consent_status: string
          consumables: string | null
          created_at: string
          discharge_instructions: string | null
          discharge_summary: string | null
          discharged_at: string | null
          duration_min: number
          ended_at: string | null
          estimate_amount: number | null
          estimate_notes: string | null
          estimated_cost: number | null
          eye: Database["public"]["Enums"]["eye_side"]
          id: string
          invoice_id: string | null
          iol_inventory_id: string | null
          iol_power: number | null
          nurse_id: string | null
          op_notes: string | null
          ot_room_id: string | null
          patient_id: string
          post_op_notes: string | null
          pre_op_notes: string | null
          preop_checklist: Json
          preop_override: boolean
          preop_override_reason: string | null
          procedure: string
          recommendation_notes: string | null
          recommended_at: string | null
          recommended_by: string | null
          scheduled_at: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["surgery_status"]
          surgeon_id: string | null
          updated_at: string
          visit_id: string | null
        }
        Insert: {
          anesthesia?: string | null
          assistant_id?: string | null
          biometry_axial_length?: number | null
          biometry_k1?: number | null
          biometry_k2?: number | null
          biometry_order_id?: string | null
          branch_id?: string | null
          complications?: string | null
          consent_document_id?: string | null
          consent_signed?: boolean
          consent_signed_at?: string | null
          consent_status?: string
          consumables?: string | null
          created_at?: string
          discharge_instructions?: string | null
          discharge_summary?: string | null
          discharged_at?: string | null
          duration_min?: number
          ended_at?: string | null
          estimate_amount?: number | null
          estimate_notes?: string | null
          estimated_cost?: number | null
          eye?: Database["public"]["Enums"]["eye_side"]
          id?: string
          invoice_id?: string | null
          iol_inventory_id?: string | null
          iol_power?: number | null
          nurse_id?: string | null
          op_notes?: string | null
          ot_room_id?: string | null
          patient_id: string
          post_op_notes?: string | null
          pre_op_notes?: string | null
          preop_checklist?: Json
          preop_override?: boolean
          preop_override_reason?: string | null
          procedure: string
          recommendation_notes?: string | null
          recommended_at?: string | null
          recommended_by?: string | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["surgery_status"]
          surgeon_id?: string | null
          updated_at?: string
          visit_id?: string | null
        }
        Update: {
          anesthesia?: string | null
          assistant_id?: string | null
          biometry_axial_length?: number | null
          biometry_k1?: number | null
          biometry_k2?: number | null
          biometry_order_id?: string | null
          branch_id?: string | null
          complications?: string | null
          consent_document_id?: string | null
          consent_signed?: boolean
          consent_signed_at?: string | null
          consent_status?: string
          consumables?: string | null
          created_at?: string
          discharge_instructions?: string | null
          discharge_summary?: string | null
          discharged_at?: string | null
          duration_min?: number
          ended_at?: string | null
          estimate_amount?: number | null
          estimate_notes?: string | null
          estimated_cost?: number | null
          eye?: Database["public"]["Enums"]["eye_side"]
          id?: string
          invoice_id?: string | null
          iol_inventory_id?: string | null
          iol_power?: number | null
          nurse_id?: string | null
          op_notes?: string | null
          ot_room_id?: string | null
          patient_id?: string
          post_op_notes?: string | null
          pre_op_notes?: string | null
          preop_checklist?: Json
          preop_override?: boolean
          preop_override_reason?: string | null
          procedure?: string
          recommendation_notes?: string | null
          recommended_at?: string | null
          recommended_by?: string | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["surgery_status"]
          surgeon_id?: string | null
          updated_at?: string
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "surgeries_assistant_id_fkey"
            columns: ["assistant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surgeries_biometry_order_id_fkey"
            columns: ["biometry_order_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surgeries_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surgeries_consent_document_id_fkey"
            columns: ["consent_document_id"]
            isOneToOne: false
            referencedRelation: "patient_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surgeries_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surgeries_iol_inventory_id_fkey"
            columns: ["iol_inventory_id"]
            isOneToOne: false
            referencedRelation: "iol_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surgeries_nurse_id_fkey"
            columns: ["nurse_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surgeries_ot_room_id_fkey"
            columns: ["ot_room_id"]
            isOneToOne: false
            referencedRelation: "ot_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surgeries_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surgeries_recommended_by_fkey"
            columns: ["recommended_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surgeries_surgeon_id_fkey"
            columns: ["surgeon_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surgeries_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      user_branches: {
        Row: {
          branch_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_branches_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      visits: {
        Row: {
          appointment_id: string | null
          branch_id: string | null
          called_at: string | null
          checked_in_at: string
          chief_complaint: string | null
          completed_at: string | null
          created_at: string
          department: string | null
          doctor_id: string | null
          id: string
          on_hold: boolean
          patient_id: string
          priority: string
          stage_changed_at: string
          status: Database["public"]["Enums"]["visit_status"]
          token_no: number | null
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          branch_id?: string | null
          called_at?: string | null
          checked_in_at?: string
          chief_complaint?: string | null
          completed_at?: string | null
          created_at?: string
          department?: string | null
          doctor_id?: string | null
          id?: string
          on_hold?: boolean
          patient_id: string
          priority?: string
          stage_changed_at?: string
          status?: Database["public"]["Enums"]["visit_status"]
          token_no?: number | null
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          branch_id?: string | null
          called_at?: string | null
          checked_in_at?: string
          chief_complaint?: string | null
          completed_at?: string | null
          created_at?: string
          department?: string | null
          doctor_id?: string | null
          id?: string
          on_hold?: boolean
          patient_id?: string
          priority?: string
          stage_changed_at?: string
          status?: Database["public"]["Enums"]["visit_status"]
          token_no?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "visits_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      app_setting: { Args: { _branch?: string; _key: string }; Returns: Json }
      available_iol_inventory: {
        Args: { _branch?: string }
        Returns: {
          branch_id: string
          expiry_date: string
          id: string
          manufacturer: string
          model_name: string
          power: number
          price: number
          serial_no: string
        }[]
      }
      can_access_branch: { Args: { _branch: string }; Returns: boolean }
      can_access_grn: { Args: { _grn_id: string }; Returns: boolean }
      can_access_invoice: { Args: { _invoice_id: string }; Returns: boolean }
      can_access_lead: { Args: { _lead_id: string }; Returns: boolean }
      can_access_patient: { Args: { _patient_id: string }; Returns: boolean }
      can_access_po: { Args: { _po_id: string }; Returns: boolean }
      can_access_prescription: { Args: { _rx_id: string }; Returns: boolean }
      can_convert_leads: { Args: { _user_id: string }; Returns: boolean }
      checkin_appointment: {
        Args: { _appointment_id: string }
        Returns: {
          appointment_id: string | null
          branch_id: string | null
          called_at: string | null
          checked_in_at: string
          chief_complaint: string | null
          completed_at: string | null
          created_at: string
          department: string | null
          doctor_id: string | null
          id: string
          on_hold: boolean
          patient_id: string
          priority: string
          stage_changed_at: string
          status: Database["public"]["Enums"]["visit_status"]
          token_no: number | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "visits"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      convert_lead_to_patient: {
        Args: { _create_new?: boolean; _lead_id: string; _patient_id?: string }
        Returns: {
          address: string | null
          allergies: string | null
          blood_group: string | null
          branch_id: string | null
          city: string | null
          converted_at: string | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          first_name: string
          gender: Database["public"]["Enums"]["gender_t"] | null
          id: string
          insurance_policy_no: string | null
          insurance_provider: string | null
          is_active: boolean
          last_name: string | null
          lead_campaign: string | null
          lead_id: string | null
          lead_source: string | null
          medical_history: string | null
          mrn: string
          phone: string
          pincode: string | null
          referred_by: string | null
          state: string | null
          updated_at: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "patients"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_walk_in_visit: {
        Args: {
          _branch_id?: string
          _chief_complaint?: string
          _doctor_id?: string
          _patient_id: string
          _priority?: string
        }
        Returns: {
          appointment_id: string | null
          branch_id: string | null
          called_at: string | null
          checked_in_at: string
          chief_complaint: string | null
          completed_at: string | null
          created_at: string
          department: string | null
          doctor_id: string | null
          id: string
          on_hold: boolean
          patient_id: string
          priority: string
          stage_changed_at: string
          status: Database["public"]["Enums"]["visit_status"]
          token_no: number | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "visits"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      crm_funnel: {
        Args: { _from: string; _to: string }
        Returns: {
          appointments: number
          campaign: string
          contacted: number
          leads: number
          patients: number
          revenue: number
          source: string
          surgeries: number
          visits: number
        }[]
      }
      dispatch_due_reminders: {
        Args: never
        Returns: {
          delivered: number
          held: number
        }[]
      }
      follow_up_state: {
        Args: { _due: string; _status: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_clinical: { Args: { _user_id: string }; Returns: boolean }
      is_finance: { Args: { _user_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      lead_patient_matches: {
        Args: { _lead_id: string }
        Returns: {
          branch_id: string
          email: string
          full_name: string
          match_on: string
          mrn: string
          patient_id: string
          phone: string
        }[]
      }
      next_invoice_no:
        | { Args: never; Returns: string }
        | { Args: { _branch?: string }; Returns: string }
      next_mrn: { Args: never; Returns: string }
      next_po_no: { Args: never; Returns: string }
      owns_patient: { Args: { _patient_id: string }; Returns: boolean }
      po_recalc: { Args: { _po_id: string }; Returns: undefined }
      recalc_invoice: { Args: { _invoice_id: string }; Returns: undefined }
      same_branch: { Args: { _branch: string }; Returns: boolean }
      user_branch_ids: {
        Args: { _user_id: string }
        Returns: {
          branch_id: string
        }[]
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "clinic_admin"
        | "receptionist"
        | "doctor"
        | "optometrist"
        | "nurse"
        | "pharmacist"
        | "optical_staff"
        | "inventory_manager"
        | "accountant"
        | "diagnostic_staff"
        | "crm_staff"
        | "patient"
      appointment_status:
        | "scheduled"
        | "confirmed"
        | "checked_in"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "no_show"
      eye_side: "OD" | "OS" | "OU"
      gender_t: "male" | "female" | "other"
      lead_status: "new" | "contacted" | "qualified" | "converted" | "lost"
      order_status:
        | "ordered"
        | "sample_collected"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "reviewed"
      payment_status: "unpaid" | "partial" | "paid" | "refunded"
      po_status:
        | "draft"
        | "sent"
        | "partially_received"
        | "received"
        | "cancelled"
      product_category:
        | "medicine"
        | "frame"
        | "lens"
        | "contact_lens"
        | "iol"
        | "consumable"
        | "equipment_part"
        | "other"
      surgery_status:
        | "planned"
        | "scheduled"
        | "in_progress"
        | "completed"
        | "postponed"
        | "cancelled"
      visit_status:
        | "waiting"
        | "optometry"
        | "with_doctor"
        | "diagnostics"
        | "billing"
        | "completed"
        | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "super_admin",
        "clinic_admin",
        "receptionist",
        "doctor",
        "optometrist",
        "nurse",
        "pharmacist",
        "optical_staff",
        "inventory_manager",
        "accountant",
        "diagnostic_staff",
        "crm_staff",
        "patient",
      ],
      appointment_status: [
        "scheduled",
        "confirmed",
        "checked_in",
        "in_progress",
        "completed",
        "cancelled",
        "no_show",
      ],
      eye_side: ["OD", "OS", "OU"],
      gender_t: ["male", "female", "other"],
      lead_status: ["new", "contacted", "qualified", "converted", "lost"],
      order_status: [
        "ordered",
        "sample_collected",
        "in_progress",
        "completed",
        "cancelled",
        "reviewed",
      ],
      payment_status: ["unpaid", "partial", "paid", "refunded"],
      po_status: [
        "draft",
        "sent",
        "partially_received",
        "received",
        "cancelled",
      ],
      product_category: [
        "medicine",
        "frame",
        "lens",
        "contact_lens",
        "iol",
        "consumable",
        "equipment_part",
        "other",
      ],
      surgery_status: [
        "planned",
        "scheduled",
        "in_progress",
        "completed",
        "postponed",
        "cancelled",
      ],
      visit_status: [
        "waiting",
        "optometry",
        "with_doctor",
        "diagnostics",
        "billing",
        "completed",
        "cancelled",
      ],
    },
  },
} as const
