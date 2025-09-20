import React, { useState, FormEvent } from "react";
import Swal from "sweetalert2";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";

const ForgotPassword = () => {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email) {
      Swal.fire({
        icon: "warning",
        title: "Thiếu email",
        text: "Vui lòng nhập địa chỉ email của bạn !",
      });
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email);
      Swal.fire({
        icon: "success",
        title: "Thành công",
        text: "Vui lòng kiểm tra hòm thư.",
      });
      setEmail("");
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Lỗi",
        text: err.message || "Đã có lỗi xảy ra. Vui lòng thử lại sau.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10">
      <h2 className="text-3xl font-bold mb-6 text-center">Quên mật khẩu</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="email">Email:</Label>
          <Input
            type="email"
            id="email"
            placeholder="Nhập email đã đăng ký"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Đang gửi .... " : "Gửi email đặt lại mật khẩu"}
        </Button>
      </form>

      {/* Nút quay về đăng nhập */}
      <div className="mt-4 text-center">
        <Button
          variant="outline"
          onClick={() => navigate("/login")} // 👈 chuyển về trang đăng nhập
        >
          Quay về đăng nhập
        </Button>
      </div>
    </div>
  );
};

export default ForgotPassword;
